const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, "../.env") });

const dbType = process.env.DB_TYPE || 'supabase';

let supabase = null;

try {
  supabase = require('./supabase');
  console.log('ℹ️ Loaded Supabase client.');
} catch (error) {
  console.error('❌ Failed to load Supabase config:', error.message);
}

const useMock = !supabase || 
  process.env.DB_TYPE === 'mock-supabase' || 
  !process.env.SUPABASE_URL || 
  process.env.SUPABASE_URL.includes('placeholder') || 
  process.env.SUPABASE_URL === '';

const mockDb = {};
const mockCounters = {};
const fallbackCollections = new Set();

// Helper to determine primary key ID field based on collection name
function getIdField(collectionName) {
  if (collectionName === 'registration_status_history') return 'history_id';
  if (collectionName === 'attendance_records') return 'attendance_id';
  if (collectionName === 'project_submissions') return 'submission_id';
  if (collectionName === 'certificates') return 'certificate_id';
  if (collectionName === 'team_members') return 'team_member_id';
  if (collectionName === 'student_attendance') return 'id';
  if (collectionName === 'coordinators') return 'coordinator_id';
  if (collectionName === 'notifications') return 'notification_id';
  return collectionName.substring(0, collectionName.length - 1) + '_id';
}

// Transaction-safe Firestore Auto-Increment generator / Supabase order-by max resolver
async function getNextId(collectionName) {
  if (useMock || fallbackCollections.has(collectionName)) {
    mockCounters[collectionName] = (mockCounters[collectionName] || 0) + 1;
    saveMockDb();
    return mockCounters[collectionName];
  }
  const idField = getIdField(collectionName);
  try {
    const { data, error } = await supabase
      .from(collectionName)
      .select(idField)
      .order(idField, { ascending: false })
      .limit(1);

    if (error) {
      if (isTableMissingError(error)) {
        console.warn(`[Supabase fallback] Table '${collectionName}' is missing during getNextId. Using local mock counter.`);
        enableLocalFallback(collectionName);
        mockCounters[collectionName] = (mockCounters[collectionName] || 0) + 1;
        saveMockDb();
        return mockCounters[collectionName];
      }
      console.error(`[Supabase error] getNextId for ${collectionName} failed:`, error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      return 1;
    }

    const maxId = parseInt(data[0][idField]);
    return isNaN(maxId) ? 1 : maxId + 1;
  } catch (e) {
    if (isTableMissingError(e)) {
      console.warn(`[Supabase fallback] Table '${collectionName}' is missing during getNextId. Using local mock counter.`);
      enableLocalFallback(collectionName);
      mockCounters[collectionName] = (mockCounters[collectionName] || 0) + 1;
      saveMockDb();
      return mockCounters[collectionName];
    }
    throw e;
  }
}

// Mock Firestore Classes for zero-config mode
class MockDocRef {
  constructor(collection, id) {
    this.collection = collection;
    this.id = String(id);
  }
  async get() {
    const data = this.collection.dbRef[this.collection.name]?.[this.id];
    if (data === undefined) {
      return { id: this.id, exists: false, data: () => undefined };
    }
    const clone = JSON.parse(JSON.stringify(data));
    return { id: this.id, exists: true, data: () => clone };
  }
  async set(data) {
    if (!this.collection.dbRef[this.collection.name]) {
      this.collection.dbRef[this.collection.name] = {};
    }
    this.collection.dbRef[this.collection.name][this.id] = JSON.parse(JSON.stringify(data));
    saveMockDb();
  }
  async update(data) {
    if (!this.collection.dbRef[this.collection.name]) {
      this.collection.dbRef[this.collection.name] = {};
    }
    const current = this.collection.dbRef[this.collection.name][this.id] || {};
    this.collection.dbRef[this.collection.name][this.id] = {
      ...current,
      ...JSON.parse(JSON.stringify(data))
    };
    saveMockDb();
  }
  async delete() {
    if (this.collection.dbRef[this.collection.name]) {
      delete this.collection.dbRef[this.collection.name][this.id];
      saveMockDb();
    }
  }
}

class MockQuery {
  constructor(collection, docs = null) {
    this.collection = collection;
    if (docs) {
      this.docs = docs;
    } else {
      const colData = this.collection.dbRef[this.collection.name] || {};
      this.docs = Object.keys(colData).map(id => {
        return {
          id: String(id),
          exists: true,
          data: () => JSON.parse(JSON.stringify(colData[id])),
          get ref() {
            return {
              update: async (data) => {
                colData[id] = { ...colData[id], ...JSON.parse(JSON.stringify(data)) };
                saveMockDb();
              }
            };
          }
        };
      });
    }
  }

  where(field, operator, value) {
    const filteredDocs = this.docs.filter(doc => {
      const data = doc.data();
      const val = data?.[field];
      if (operator === '==' || operator === '===') {
        if (typeof val === 'string' && typeof value === 'string') {
          return val.toLowerCase() === value.toLowerCase();
        }
        return val === value;
      }
      if (operator === '!=') {
        return val !== value;
      }
      return false;
    });
    return new MockQuery(this.collection, filteredDocs);
  }

  limit(n) {
    return new MockQuery(this.collection, this.docs.slice(0, n));
  }

  async get() {
    return {
      empty: this.docs.length === 0,
      size: this.docs.length,
      docs: this.docs
    };
  }
}

class MockCollection {
  constructor(name, dbRef) {
    this.name = name;
    this.dbRef = dbRef;
  }
  doc(id) {
    return new MockDocRef(this, id);
  }
  where(field, operator, value) {
    return new MockQuery(this).where(field, operator, value);
  }
  limit(n) {
    return new MockQuery(this).limit(n);
  }
  async get() {
    return new MockQuery(this).get();
  }
  async add(data) {
    const nextId = await getNextId(this.name);
    const idField = getIdField(this.name);
    const finalData = {
      ...data,
      [idField]: nextId,
      created_at: new Date().toISOString()
    };
    await this.doc(nextId).set(finalData);
    return { id: String(nextId) };
  }
}

class MockFirestore {
  constructor(dbRef) {
    this.dbRef = dbRef;
  }
  collection(name) {
    return new MockCollection(name, this.dbRef);
  }
  async runTransaction(updateFunction) {
    const transaction = {
      get: async (docRef) => docRef.get(),
      set: async (docRef, data) => docRef.set(data),
      update: async (docRef, data) => docRef.update(data),
      delete: async (docRef) => docRef.delete()
    };
    return updateFunction(transaction);
  }
}

class SupabaseDocRef {
  constructor(collection, id) {
    this.collection = collection;
    this.id = String(id);
  }
  async get() {
    const idField = getIdField(this.collection.name);
    const idVal = isNaN(parseInt(this.id)) ? this.id : parseInt(this.id);
    console.log(`[Supabase debug] GET ${this.collection.name} where ${idField} = ${idVal}`);
    try {
      const { data, error } = await supabase
        .from(this.collection.name)
        .select('*')
        .eq(idField, idVal)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
          enableLocalFallback(this.collection.name);
          return await mockFirestore.collection(this.collection.name).doc(this.id).get();
        }
        console.error(`[Supabase error] GET ${this.collection.name} failed:`, error.message);
        throw error;
      }

      if (!data) {
        return { id: this.id, exists: false, data: () => undefined };
      }
      return { id: this.id, exists: true, data: () => data };
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
        enableLocalFallback(this.collection.name);
        return await mockFirestore.collection(this.collection.name).doc(this.id).get();
      }
      throw e;
    }
  }
  async set(data) {
    const idField = getIdField(this.collection.name);
    const idVal = isNaN(parseInt(this.id)) ? this.id : parseInt(this.id);
    const finalData = { ...data, [idField]: idVal };
    console.log(`[Supabase debug] SET ${this.collection.name} [ID: ${idVal}] data:`, JSON.stringify(finalData));

    try {
      const { error } = await supabase
        .from(this.collection.name)
        .upsert(finalData, { onConflict: idField });

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
          enableLocalFallback(this.collection.name);
          return await mockFirestore.collection(this.collection.name).doc(this.id).set(data);
        }
        console.error(`[Supabase error] SET ${this.collection.name} failed:`, error.message);
        throw error;
      }
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
        enableLocalFallback(this.collection.name);
        return await mockFirestore.collection(this.collection.name).doc(this.id).set(data);
      }
      throw e;
    }
  }
  async update(data) {
    const idField = getIdField(this.collection.name);
    const idVal = isNaN(parseInt(this.id)) ? this.id : parseInt(this.id);
    console.log(`[Supabase debug] UPDATE ${this.collection.name} [ID: ${idVal}] data:`, JSON.stringify(data));

    try {
      const { error } = await supabase
        .from(this.collection.name)
        .update(data)
        .eq(idField, idVal);

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
          enableLocalFallback(this.collection.name);
          return await mockFirestore.collection(this.collection.name).doc(this.id).update(data);
        }
        console.error(`[Supabase error] UPDATE ${this.collection.name} failed:`, error.message);
        throw error;
      }
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
        enableLocalFallback(this.collection.name);
        return await mockFirestore.collection(this.collection.name).doc(this.id).update(data);
      }
      throw e;
    }
  }
  async delete() {
    const idField = getIdField(this.collection.name);
    const idVal = isNaN(parseInt(this.id)) ? this.id : parseInt(this.id);
    console.log(`[Supabase debug] DELETE ${this.collection.name} [ID: ${idVal}]`);

    try {
      const { error } = await supabase
        .from(this.collection.name)
        .delete()
        .eq(idField, idVal);

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
          enableLocalFallback(this.collection.name);
          return await mockFirestore.collection(this.collection.name).doc(this.id).delete();
        }
        console.error(`[Supabase error] DELETE ${this.collection.name} failed:`, error.message);
        throw error;
      }
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
        enableLocalFallback(this.collection.name);
        return await mockFirestore.collection(this.collection.name).doc(this.id).delete();
      }
      throw e;
    }
  }
}

class SupabaseQuery {
  constructor(collection) {
    this.collection = collection;
    this.filters = [];
    this.limitVal = null;
  }
  where(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }
  limit(n) {
    this.limitVal = n;
    return this;
  }
  async get() {
    if (fallbackCollections.has(this.collection.name)) {
      let mockQuery = mockFirestore.collection(this.collection.name);
      for (const f of this.filters) {
        mockQuery = mockQuery.where(f.field, f.operator, f.value);
      }
      if (this.limitVal !== null) {
        mockQuery = mockQuery.limit(this.limitVal);
      }
      return await mockQuery.get();
    }

    console.log(`[Supabase debug] QUERY ${this.collection.name} with filters:`, JSON.stringify(this.filters));
    try {
      let queryBuilder = supabase.from(this.collection.name).select('*');

      for (const f of this.filters) {
        const fieldVal = isNaN(parseInt(f.value)) ? f.value : parseInt(f.value);
        if (f.operator === '==' || f.operator === '===') {
          queryBuilder = queryBuilder.eq(f.field, fieldVal);
        } else if (f.operator === '!=') {
          queryBuilder = queryBuilder.neq(f.field, fieldVal);
        }
      }

      if (this.limitVal !== null) {
        queryBuilder = queryBuilder.limit(this.limitVal);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
          enableLocalFallback(this.collection.name);
          let mockQuery = mockFirestore.collection(this.collection.name);
          for (const f of this.filters) {
            mockQuery = mockQuery.where(f.field, f.operator, f.value);
          }
          if (this.limitVal !== null) {
            mockQuery = mockQuery.limit(this.limitVal);
          }
          return await mockQuery.get();
        }
        console.error(`[Supabase error] QUERY ${this.collection.name} failed:`, error.message);
        throw error;
      }

      const docs = (data || []).map(row => {
        const idField = getIdField(this.collection.name);
        return {
          id: String(row[idField]),
          exists: true,
          data: () => row,
          get ref() {
            return {
              update: async (updateData) => {
                const { error: ue } = await supabase
                  .from(this.collection.name)
                  .update(updateData)
                  .eq(idField, row[idField]);
                if (ue) throw ue;
              }
            };
          }
        };
      });

      return {
        empty: docs.length === 0,
        size: docs.length,
        docs: docs
      };
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.collection.name}' is missing. Using local mock.`);
        enableLocalFallback(this.collection.name);
        let mockQuery = mockFirestore.collection(this.collection.name);
        for (const f of this.filters) {
          mockQuery = mockQuery.where(f.field, f.operator, f.value);
        }
        if (this.limitVal !== null) {
          mockQuery = mockQuery.limit(this.limitVal);
        }
        return await mockQuery.get();
      }
      throw e;
    }
  }
}

class SupabaseCollection {
  constructor(name) {
    this.name = name;
  }
  doc(id) {
    if (fallbackCollections.has(this.name)) {
      return mockFirestore.collection(this.name).doc(id);
    }
    return new SupabaseDocRef(this, id);
  }
  where(field, operator, value) {
    if (fallbackCollections.has(this.name)) {
      return mockFirestore.collection(this.name).where(field, operator, value);
    }
    return new SupabaseQuery(this).where(field, operator, value);
  }
  limit(n) {
    if (fallbackCollections.has(this.name)) {
      return mockFirestore.collection(this.name).limit(n);
    }
    return new SupabaseQuery(this).limit(n);
  }
  async get() {
    if (fallbackCollections.has(this.name)) {
      return mockFirestore.collection(this.name).get();
    }
    return new SupabaseQuery(this).get();
  }
  async add(data) {
    if (fallbackCollections.has(this.name)) {
      return mockFirestore.collection(this.name).add(data);
    }

    const idField = getIdField(this.name);
    const nextId = await getNextId(this.name);
    const finalData = {
      ...data,
      [idField]: nextId
    };
    console.log(`[Supabase debug] ADD ${this.name} [ID: ${nextId}] data:`, JSON.stringify(finalData));

    try {
      const { error } = await supabase
        .from(this.name)
        .insert(finalData);

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(`[Supabase fallback] Table '${this.name}' is missing. Using local mock.`);
          enableLocalFallback(this.name);
          return await mockFirestore.collection(this.name).add(data);
        }
        console.error(`[Supabase error] ADD ${this.name} failed:`, error.message);
        throw error;
      }

      return { id: String(nextId) };
    } catch (e) {
      if (isTableMissingError(e)) {
        console.warn(`[Supabase fallback] Table '${this.name}' is missing. Using local mock.`);
        enableLocalFallback(this.name);
        return await mockFirestore.collection(this.name).add(data);
      }
      throw e;
    }
  }
}

class SupabaseFirestore {
  collection(name) {
    if (fallbackCollections.has(name)) {
      return mockFirestore.collection(name);
    }
    return new SupabaseCollection(name);
  }
  async runTransaction(updateFunction) {
    const transaction = {
      get: async (docRef) => docRef.get(),
      set: async (docRef, data) => docRef.set(data),
      update: async (docRef, data) => docRef.update(data),
      delete: async (docRef) => docRef.delete()
    };
    return updateFunction(transaction);
  }
}

const mockFirestore = new MockFirestore(mockDb);
const supabaseFirestore = new SupabaseFirestore();
const db = useMock ? mockFirestore : supabaseFirestore;

// Helper CRUD operations pointing to active db instance
async function getAllDocs(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function queryDocs(collectionName, filterFn) {
  const docs = await getAllDocs(collectionName);
  return docs.filter(filterFn);
}

async function addDoc(collectionName, data) {
  const nextId = await getNextId(collectionName);
  const idField = getIdField(collectionName);
  const finalData = { ...data, [idField]: nextId, created_at: new Date().toISOString() };
  await db.collection(collectionName).doc(String(nextId)).set(finalData);
  return { insertId: nextId, affectedRows: 1 };
}

async function updateDoc(collectionName, id, data) {
  await db.collection(collectionName).doc(String(id)).update(data);
}

async function updateDocWhere(collectionName, filterFn, data) {
  const snapshot = await db.collection(collectionName).get();
  for (const doc of snapshot.docs) {
    const docData = { id: doc.id, ...doc.data() };
    if (filterFn(docData)) {
      await doc.ref.update(data);
    }
  }
}

async function deleteDoc(collectionName, id) {
  await db.collection(collectionName).doc(String(id)).delete();
}

// Full SQL query parser to translate legacy test queries to Firestore
async function query(sql, params = []) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  const cleanSqlLower = cleanSql.toLowerCase();

  // 1. SELECT * FROM workshops / SELECT COUNT(*) FROM workshops
  if (cleanSqlLower === 'select * from workshops') {
    return await getAllDocs('workshops');
  }
  
  // Generic SELECT COUNT(*) FROM <table> handler
  const countRegex = /^select count\(\*\)(?: as \w+)? from (\w+)$/i;
  const countMatch = cleanSql.match(countRegex);
  if (countMatch) {
    const collectionName = countMatch[1];
    const docs = await getAllDocs(collectionName);
    return [{ count: docs.length, 'COUNT(*)': docs.length }];
  }

  // 2. SELECT ... FROM workshops WHERE workshop_id = ?
  if (cleanSqlLower.includes('from workshops') && cleanSqlLower.includes('where workshop_id = ?')) {
    const wId = parseInt(params[0]);
    return await queryDocs('workshops', w => w.workshop_id === wId);
  }

  // 3. SELECT COUNT(*) FROM registrations WHERE workshop_id = ?
  if (cleanSqlLower.includes('select count(*)') && cleanSqlLower.includes('from registrations') && cleanSqlLower.includes('where workshop_id = ?')) {
    const wId = parseInt(params[0]);
    const regs = await queryDocs('registrations', r => r.workshop_id === wId);
    return [{ count: regs.length, 'COUNT(*)': regs.length }];
  }

  // 4. SELECT count(*) as total, sum(case when confirmation_status = 'approved' then 1 else 0 end) as approved, ...
  if (cleanSqlLower.includes('select count(*) as total') && cleanSqlLower.includes('from registrations')) {
    const regs = await getAllDocs('registrations');
    const total = regs.length;
    const approved = regs.filter(r => r.confirmation_status === 'Approved').length;
    const pending = regs.filter(r => r.confirmation_status === 'Pending').length;
    const rejected = regs.filter(r => r.confirmation_status === 'Rejected').length;
    return [{ total, approved, pending, rejected }];
  }

  // 5. SELECT workshop_id, COUNT(*) as reg_count FROM registrations WHERE confirmation_status = 'Approved' GROUP BY workshop_id
  if (cleanSqlLower.includes('from registrations') && cleanSqlLower.includes('group by workshop_id')) {
    const regs = await getAllDocs('registrations');
    const approvedRegs = regs.filter(r => r.confirmation_status === 'Approved');
    const counts = {};
    approvedRegs.forEach(r => {
      counts[r.workshop_id] = (counts[r.workshop_id] || 0) + 1;
    });
    return Object.keys(counts).map(wId => ({
      workshop_id: parseInt(wId),
      reg_count: counts[wId],
      count: counts[wId]
    }));
  }

  // 6. SELECT w.workshop_id, w.title, w.capacity, w.status, COUNT(r.registration_id) as count FROM workshops w LEFT JOIN registrations r ON w.workshop_id = r.workshop_id GROUP BY w.workshop_id
  if (cleanSqlLower.includes('group by w.workshop_id') && cleanSqlLower.includes('from workshops w')) {
    const workshops = await getAllDocs('workshops');
    const regs = await getAllDocs('registrations');
    return workshops.map(w => {
      const count = regs.filter(r => r.workshop_id === w.workshop_id).length;
      return {
        workshop_id: w.workshop_id,
        title: w.title,
        capacity: w.capacity,
        status: w.status,
        count: count
      };
    });
  }

  // 7. SELECT c.name, COUNT(r.registration_id) as count FROM colleges c JOIN students s ON c.college_id = s.college_id JOIN registrations r ON s.student_id = r.student_id GROUP BY c.college_id ORDER BY count DESC LIMIT 5
  if (cleanSqlLower.includes('group by c.college_id') && cleanSqlLower.includes('limit 5')) {
    const colleges = await getAllDocs('colleges');
    const students = await getAllDocs('students');
    const regs = await getAllDocs('registrations');
    
    const collegeCounts = colleges.map(c => {
      const studentIds = students.filter(s => s.college_id === c.college_id).map(s => s.student_id);
      const count = regs.filter(r => studentIds.includes(r.student_id)).length;
      return { name: c.name, count };
    });
    
    return collegeCounts.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  // 8. SELECT student_id FROM students WHERE LOWER(email) = ? / SELECT * FROM students WHERE LOWER(email) = ?
  if (cleanSqlLower.includes('from students') && cleanSqlLower.includes('where lower(email) = ?')) {
    const email = params[0].toLowerCase();
    const students = await queryDocs('students', s => s.email.toLowerCase() === email);
    if (cleanSqlLower.includes('select student_id')) {
      return students.map(s => ({ student_id: s.student_id }));
    }
    return students;
  }

  // 9. SELECT college_id FROM colleges WHERE LOWER(name) = ?
  if (cleanSqlLower.includes('from colleges') && cleanSqlLower.includes('where lower(name) = ?')) {
    const name = params[0].toLowerCase();
    const colleges = await queryDocs('colleges', c => c.name.toLowerCase() === name);
    return colleges.map(c => ({ college_id: c.college_id }));
  }

  // 10. SELECT s.student_id, s.name, s.email, s.phone, s.branch, s.semester, c.name as college_name FROM students s JOIN colleges c ON s.college_id = c.college_id WHERE s.student_id = ?
  if (cleanSqlLower.includes('from students s') && cleanSqlLower.includes('join colleges c') && cleanSqlLower.includes('where s.student_id = ?')) {
    const sId = parseInt(params[0]);
    const students = await queryDocs('students', s => s.student_id === sId);
    if (students.length === 0) return [];
    const student = students[0];
    const colleges = await queryDocs('colleges', c => c.college_id === student.college_id);
    return [{
      ...student,
      college_name: colleges[0]?.name || 'Unknown'
    }];
  }

  // 11. SELECT r.registration_id, r.registration_date, r.payment_status, r.confirmation_status, w.workshop_id, w.title as workshop_title, ... WHERE r.student_id = ?
  if (cleanSqlLower.includes('from registrations r') && cleanSqlLower.includes('where r.student_id = ?')) {
    const sId = parseInt(params[0]);
    const regs = await queryDocs('registrations', r => r.student_id === sId);
    const result = [];
    for (const r of regs) {
      const workshops = await queryDocs('workshops', w => w.workshop_id === r.workshop_id);
      const teams = r.team_id ? await queryDocs('teams', t => t.team_id === r.team_id) : [];
      result.push({
        registration_id: r.registration_id,
        registration_date: r.registration_date,
        payment_status: r.payment_status,
        confirmation_status: r.confirmation_status,
        workshop_id: r.workshop_id,
        workshop_title: workshops[0]?.title || '',
        workshop_description: workshops[0]?.description || '',
        workshop_fee: workshops[0]?.fee || 0,
        trainer_name: workshops[0]?.trainer_name || workshops[0]?.trainerName || '',
        schedule: workshops[0]?.schedule || '',
        venue: workshops[0]?.venue || '',
        deadline: workshops[0]?.deadline || null,
        team_id: r.team_id || null,
        team_name: teams[0]?.team_name || '',
        member_count: teams[0]?.member_count || 0
      });
    }
    return result;
  }

  // 12. SELECT attendance_id, session_date, status FROM attendance_records WHERE registration_id = ? ORDER BY session_date ASC
  if (cleanSqlLower.includes('from attendance_records') && cleanSqlLower.includes('where registration_id = ?')) {
    const rId = parseInt(params[0]);
    const atts = await queryDocs('attendance_records', a => a.registration_id === rId);
    return atts.sort((a, b) => a.session_date.localeCompare(b.session_date));
  }

  // 13. SELECT submission_id, project_title, description, ... FROM project_submissions WHERE registration_id = ?
  if (cleanSqlLower.includes('from project_submissions') && cleanSqlLower.includes('where registration_id = ?')) {
    const rId = parseInt(params[0]);
    return await queryDocs('project_submissions', p => p.registration_id === rId);
  }

  // 14. SELECT certificate_id, certificate_code, issue_date, download_url FROM certificates WHERE registration_id = ?
  if (cleanSqlLower.includes('from certificates') && cleanSqlLower.includes('where registration_id = ?')) {
    const rId = parseInt(params[0]);
    return await queryDocs('certificates', c => c.registration_id === rId);
  }

  // 15. SELECT student_name, student_email, student_phone FROM team_members WHERE team_id = ?
  if (cleanSqlLower.includes('from team_members') && cleanSqlLower.includes('where team_id = ?')) {
    const tId = parseInt(params[0]);
    return await queryDocs('team_members', tm => tm.team_id === tId);
  }

  // 16. SELECT student_id FROM registrations WHERE registration_id = ?
  if (cleanSqlLower.includes('from registrations') && cleanSqlLower.includes('where registration_id = ?')) {
    const rId = parseInt(params[0]);
    const regs = await queryDocs('registrations', r => r.registration_id === rId);
    
    if (cleanSqlLower.includes('select r.registration_id, r.registration_date') || cleanSqlLower.includes('join students s')) {
      if (regs.length === 0) return [];
      const r = regs[0];
      const students = await queryDocs('students', s => s.student_id === r.student_id);
      const s = students[0] || {};
      const colleges = await queryDocs('colleges', c => c.college_id === s.college_id);
      const c = colleges[0] || {};
      const workshops = await queryDocs('workshops', w => w.workshop_id === r.workshop_id);
      const w = workshops[0] || {};
      const teams = r.team_id ? await queryDocs('teams', t => t.team_id === r.team_id) : [];
      const t = teams[0] || {};

      return [{
        registration_id: r.registration_id,
        registration_date: r.registration_date,
        payment_status: r.payment_status,
        confirmation_status: r.confirmation_status,
        created_at: r.created_at,
        student_id: s.student_id,
        student_name: s.name,
        student_email: s.email,
        student_phone: s.phone,
        branch: s.branch,
        semester: s.semester,
        college_id: c.college_id,
        college_name: c.name,
        college_city: c.city,
        college_state: c.state,
        workshop_id: w.workshop_id,
        workshop_title: w.title,
        workshop_description: w.description,
        workshop_fee: w.fee,
        trainer_name: w.trainer_name || w.trainerName || '',
        team_id: t.team_id || null,
        team_name: t.team_name || '',
        member_count: t.member_count || 0
      }];
    }

    if (cleanSqlLower.includes('select confirmation_status')) {
      return regs.map(r => ({ confirmation_status: r.confirmation_status }));
    }
    if (cleanSqlLower.includes('select payment_status')) {
      return regs.map(r => ({ payment_status: r.payment_status, confirmation_status: r.confirmation_status }));
    }
    return regs.map(r => ({ student_id: r.student_id }));
  }

  // 17. SELECT registration_id FROM registrations WHERE student_id = ? AND workshop_id = ?
  if (cleanSqlLower.includes('from registrations') && cleanSqlLower.includes('where student_id = ? and workshop_id = ?')) {
    const sId = parseInt(params[0]);
    const wId = parseInt(params[1]);
    const regs = await queryDocs('registrations', r => r.student_id === sId && r.workshop_id === wId);
    return regs.map(r => ({ registration_id: r.registration_id }));
  }

  // 19. SELECT history_id, previous_status, new_status, changed_by, changed_at, remarks FROM registration_status_history WHERE registration_id = ? ORDER BY changed_at DESC
  if (cleanSqlLower.includes('from registration_status_history') && cleanSqlLower.includes('where registration_id = ?')) {
    const rId = parseInt(params[0]);
    const hist = await queryDocs('registration_status_history', h => h.registration_id === rId);
    return hist.sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }

  // 20. Admin getAllRegistrations with pagination, search, and filtering
  if (cleanSqlLower.includes('from registrations r') && cleanSqlLower.includes('join students s') && cleanSqlLower.includes('where 1=1')) {
    const registrations = await getAllDocs('registrations');
    const students = await getAllDocs('students');
    const colleges = await getAllDocs('colleges');
    const workshops = await getAllDocs('workshops');

    let result = registrations.map(r => {
      const student = students.find(s => s.student_id === r.student_id) || {};
      const college = colleges.find(c => c.college_id === student.college_id) || {};
      const workshop = workshops.find(w => w.workshop_id === r.workshop_id) || {};
      return {
        registration_id: r.registration_id,
        registration_date: r.registration_date,
        payment_status: r.payment_status,
        confirmation_status: r.confirmation_status,
        student_id: student.student_id,
        student_name: student.name || '',
        student_email: student.email || '',
        student_phone: student.phone || '',
        branch: student.branch || '',
        college_id: college.college_id,
        college_name: college.name || '',
        workshop_id: workshop.workshop_id,
        workshop_title: workshop.title || ''
      };
    });

    let paramIdx = 0;
    
    if (cleanSqlLower.includes('lower(s.name) like ?')) {
      const search = params[paramIdx++].replace(/%/g, '').toLowerCase();
      result = result.filter(r => 
        r.student_name.toLowerCase().includes(search) || 
        r.student_email.toLowerCase().includes(search) || 
        r.college_name.toLowerCase().includes(search)
      );
    }
    
    if (cleanSqlLower.includes('r.workshop_id = ?')) {
      const wId = parseInt(params[paramIdx++]);
      result = result.filter(r => r.workshop_id === wId);
    }
    
    if (cleanSqlLower.includes('lower(c.name) like ?')) {
      const colSearch = params[paramIdx++].replace(/%/g, '').toLowerCase();
      result = result.filter(r => r.college_name.toLowerCase().includes(colSearch));
    }
    
    if (cleanSqlLower.includes('r.payment_status = ?')) {
      const payStatus = params[paramIdx++];
      result = result.filter(r => r.payment_status === payStatus);
    }
    
    if (cleanSqlLower.includes('r.confirmation_status = ?')) {
      const confStatus = params[paramIdx++];
      result = result.filter(r => r.confirmation_status === confStatus);
    }

    result.sort((a, b) => b.registration_date.localeCompare(a.registration_date));
    return result;
  }

  // 21. SELECT tm.team_member_id FROM team_members tm JOIN registrations r ON tm.team_id = r.team_id WHERE LOWER(tm.student_email) = ? AND r.workshop_id = ?
  if (cleanSqlLower.includes('from team_members tm') && cleanSqlLower.includes('join registrations r') && cleanSqlLower.includes('where lower(tm.student_email) = ? and r.workshop_id = ?')) {
    const email = params[0].toLowerCase();
    const wId = parseInt(params[1]);

    const regs = await queryDocs('registrations', r => r.workshop_id === wId);
    const teamIds = regs.map(r => r.team_id).filter(Boolean);
    
    const members = await queryDocs('team_members', tm => 
      teamIds.includes(tm.team_id) && tm.student_email.toLowerCase() === email
    );
    
    return members.map(m => ({ team_member_id: m.team_member_id }));
  }

  // 24. SELECT attendance_id FROM attendance_records WHERE registration_id = ? AND session_date = ?
  if (cleanSqlLower === 'select attendance_id from attendance_records where registration_id = ? and session_date = ?') {
    const rId = parseInt(params[0]);
    const date = params[1];
    const atts = await queryDocs('attendance_records', a => a.registration_id === rId && a.session_date === date);
    return atts.map(a => ({ attendance_id: a.attendance_id }));
  }

  // 25. SELECT submission_id FROM project_submissions WHERE registration_id = ?
  if (cleanSqlLower === 'select submission_id from project_submissions where registration_id = ?') {
    const rId = parseInt(params[0]);
    const subs = await queryDocs('project_submissions', p => p.registration_id === rId);
    return subs.map(s => ({ submission_id: s.submission_id }));
  }

  // 27. SELECT certificate_code, download_url FROM certificates WHERE registration_id = ?
  if (cleanSqlLower === 'select certificate_code, download_url from certificates where registration_id = ?') {
    const rId = parseInt(params[0]);
    const certs = await queryDocs('certificates', c => c.registration_id === rId);
    return certs.map(c => ({ certificate_code: c.certificate_code, download_url: c.download_url }));
  }

  // 28. SELECT workshop_id FROM workshops WHERE LOWER(title) = ? / LOWER(title) = ? AND workshop_id != ?
  if (cleanSqlLower.includes('from workshops') && cleanSqlLower.includes('lower(title) = ?')) {
    const title = params[0].toLowerCase();
    let ws;
    if (cleanSqlLower.includes('workshop_id != ?')) {
      const wId = parseInt(params[1]);
      ws = await queryDocs('workshops', w => w.title.toLowerCase() === title && w.workshop_id !== wId);
    } else {
      ws = await queryDocs('workshops', w => w.title.toLowerCase() === title);
    }
    return ws.map(w => ({ workshop_id: w.workshop_id }));
  }

  // --- WRITE OPERATIONS ---

  // 30. INSERT INTO colleges (name, city, state) VALUES (?, ?, ?)
  if (cleanSqlLower.startsWith('insert into colleges')) {
    return await addDoc('colleges', { name: params[0], city: params[1], state: params[2] });
  }

  // 31. INSERT INTO students
  if (cleanSqlLower.startsWith('insert into students')) {
    if (cleanSqlLower.includes('password')) {
      return await addDoc('students', {
        name: params[0],
        email: params[1],
        phone: params[2],
        college_id: parseInt(params[3]),
        branch: params[4],
        semester: params[5],
        password: params[6]
      });
    } else {
      return await addDoc('students', {
        name: params[0],
        email: params[1],
        phone: params[2],
        college_id: parseInt(params[3]),
        branch: params[4],
        semester: params[5]
      });
    }
  }

  // 32. INSERT INTO registrations
  if (cleanSqlLower.startsWith('insert into registrations')) {
    return await addDoc('registrations', {
      student_id: parseInt(params[0]),
      workshop_id: parseInt(params[1]),
      team_id: params[2] ? parseInt(params[2]) : null,
      payment_status: params[3] || 'Pending',
      confirmation_status: params[4] || 'Pending',
      registration_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  // 33. INSERT INTO teams (team_name, leader_student_id, member_count) VALUES (?, ?, ?)
  if (cleanSqlLower.startsWith('insert into teams')) {
    return await addDoc('teams', {
      team_name: params[0],
      leader_student_id: parseInt(params[1]),
      member_count: parseInt(params[2])
    });
  }

  // 34. INSERT INTO team_members (team_id, student_name, student_email, student_phone) VALUES (?, ?, ?, ?)
  if (cleanSqlLower.startsWith('insert into team_members')) {
    return await addDoc('team_members', {
      team_id: parseInt(params[0]),
      student_name: params[1],
      student_email: params[2],
      student_phone: params[3]
    });
  }

  // 35. INSERT INTO registration_status_history (registration_id, previous_status, new_status, changed_by, remarks) VALUES (?, ?, ?, ?, ?)
  if (cleanSqlLower.startsWith('insert into registration_status_history')) {
    return await addDoc('registration_status_history', {
      registration_id: parseInt(params[0]),
      previous_status: params[1],
      new_status: params[2],
      changed_by: params[3],
      remarks: params[4],
      changed_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  // 36. INSERT INTO attendance_records (registration_id, session_date, status) VALUES (?, ?, ?)
  if (cleanSqlLower.startsWith('insert into attendance_records')) {
    return await addDoc('attendance_records', {
      registration_id: parseInt(params[0]),
      session_date: params[1],
      status: params[2]
    });
  }

  // 37. INSERT INTO project_submissions
  if (cleanSqlLower.startsWith('insert into project_submissions')) {
    if (params.length === 6) {
      return await addDoc('project_submissions', {
        registration_id: parseInt(params[0]),
        project_title: params[1],
        description: params[2],
        submission_link: params[3],
        score: params[4] !== undefined ? parseInt(params[4]) : null,
        remarks: params[5] || '',
        submission_date: new Date().toISOString()
      });
    } else {
      return await addDoc('project_submissions', {
        registration_id: parseInt(params[0]),
        project_title: params[1],
        description: params[2],
        submission_link: params[3],
        submission_date: new Date().toISOString()
      });
    }
  }

  // 38. INSERT INTO certificates (registration_id, certificate_code, download_url) VALUES (?, ?, ?)
  if (cleanSqlLower.startsWith('insert into certificates')) {
    return await addDoc('certificates', {
      registration_id: parseInt(params[0]),
      certificate_code: params[1],
      download_url: params[2],
      issue_date: new Date().toISOString()
    });
  }

  // 39. INSERT INTO workshops
  if (cleanSqlLower.startsWith('insert into workshops')) {
    return await addDoc('workshops', {
      title: params[0],
      description: params[1],
      capacity: parseInt(params[2]),
      status: params[3],
      fee: parseFloat(params[4]),
      trainer_name: params[5],
      image_url: params[6],
      deadline: params[7],
      schedule: params[8],
      venue: params[9]
    });
  }

  // --- UPDATES & DELETES ---

  // 40. UPDATE workshops SET status = ? WHERE workshop_id = ?
  if (cleanSqlLower === 'update workshops set status = ? where workshop_id = ?') {
    const status = params[0];
    const wId = parseInt(params[1]);
    await updateDoc('workshops', wId, { status });
    return { affectedRows: 1 };
  }

  // 41. UPDATE students SET name = ?, phone = ?, college_id = ?, branch = ?, semester = ? WHERE student_id = ?
  if (cleanSqlLower === 'update students set name = ?, phone = ?, college_id = ?, branch = ?, semester = ? where student_id = ?') {
    const sId = parseInt(params[5]);
    await updateDoc('students', sId, {
      name: params[0],
      phone: params[1],
      college_id: parseInt(params[2]),
      branch: params[3],
      semester: params[4]
    });
    return { affectedRows: 1 };
  }

  // 42. UPDATE project_submissions
  if (cleanSqlLower.startsWith('update project_submissions')) {
    if (cleanSqlLower.includes('score = ?')) {
      const rId = parseInt(params[5]);
      await updateDocWhere('project_submissions', p => p.registration_id === rId, {
        project_title: params[0],
        description: params[1],
        submission_link: params[2],
        score: params[3] !== null ? parseInt(params[3]) : null,
        remarks: params[4]
      });
    } else {
      const rId = parseInt(params[3]);
      await updateDocWhere('project_submissions', p => p.registration_id === rId, {
        project_title: params[0],
        description: params[1],
        submission_link: params[2]
      });
    }
    return { affectedRows: 1 };
  }

  // 43. UPDATE registrations SET confirmation_status = ? WHERE registration_id = ?
  if (cleanSqlLower === 'update registrations set confirmation_status = ? where registration_id = ?') {
    const status = params[0];
    const rId = parseInt(params[1]);
    await updateDoc('registrations', rId, { confirmation_status: status });
    return { affectedRows: 1 };
  }

  // 44. UPDATE registrations SET payment_status = ? WHERE registration_id = ?
  if (cleanSqlLower === 'update registrations set payment_status = ? where registration_id = ?') {
    const status = params[0];
    const rId = parseInt(params[1]);
    await updateDoc('registrations', rId, { payment_status: status });
    return { affectedRows: 1 };
  }

  // 45. UPDATE attendance_records SET status = ? WHERE registration_id = ? AND session_date = ?
  if (cleanSqlLower === 'update attendance_records set status = ? where registration_id = ? and session_date = ?') {
    const status = params[0];
    const rId = parseInt(params[1]);
    const date = params[2];
    await updateDocWhere('attendance_records', a => a.registration_id === rId && a.session_date === date, { status });
    return { affectedRows: 1 };
  }

  // 46. UPDATE workshops SET title = ?, description = ?, capacity = ?, status = ?, fee = ?, trainer_name = ?, image_url = ?, deadline = ?, schedule = ?, venue = ? WHERE workshop_id = ?
  if (cleanSqlLower.startsWith('update workshops set title = ?')) {
    const wId = parseInt(params[10]);
    await updateDoc('workshops', wId, {
      title: params[0],
      description: params[1],
      capacity: parseInt(params[2]),
      status: params[3],
      fee: parseFloat(params[4]),
      trainer_name: params[5],
      image_url: params[6],
      deadline: params[7],
      schedule: params[8],
      venue: params[9]
    });
    return { affectedRows: 1 };
  }

  // 47. DELETE FROM workshops WHERE workshop_id = ?
  if (cleanSqlLower === 'delete from workshops where workshop_id = ?') {
    const wId = parseInt(params[0]);
    await deleteDoc('workshops', wId);
    return { affectedRows: 1 };
  }

  console.warn('⚠️ SQLite-to-Firestore translator warning: Unhandled SQL statement string:', sql);
  return [];
}

// Default Seed Data
const defaultWorkshops = [
  {
    workshop_id: 1,
    title: 'IoT (Internet of Things)',
    description: 'Learn sensor integration, ESP8266/ESP32, MQTT protocols, cloud dashboard integration, and build actual smart device prototypes.',
    capacity: 50,
    status: 'Active',
    fee: 1499.00,
    trainer_name: 'Dr. Arul Prasad',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    deadline: '2026-08-30 23:59:59',
    schedule: 'Mon-Tue 09:30 AM - 04:30 PM',
    venue: 'IoT Lab, 3rd Floor, Sansah Center'
  },
  {
    workshop_id: 2,
    title: 'Embedded Systems',
    description: 'Deep dive into 8051 and PIC microcontrollers, register configuration, GPIO operations, serial communication (UART, I2C, SPI), and hardware assembly.',
    capacity: 45,
    status: 'Active',
    fee: 1299.00,
    trainer_name: 'Er. Rajesh Kumar',
    image_url: 'https://images.unsplash.com/photo-1517055720413-77a282b112e7?auto=format&fit=crop&w=600&q=80',
    deadline: '2026-08-31 23:59:59',
    schedule: 'Wed-Thu 09:30 AM - 04:30 PM',
    venue: 'Microcontroller Lab, 2nd Floor'
  },
  {
    workshop_id: 3,
    title: 'PCB Design',
    description: 'Master schematic drafting, multilayer footprint placement, PCB routing techniques using Altium/Eagle CAD, and prototype manufacturing steps.',
    capacity: 30,
    status: 'Active',
    fee: 999.00,
    trainer_name: 'Ms. Priyadarshini S.',
    image_url: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=600&q=80',
    deadline: '2026-09-05 23:59:59',
    schedule: 'Fri 09:30 AM - 04:30 PM',
    venue: 'Hardware Design Lab, Ground Floor'
  },
  {
    workshop_id: 4,
    title: 'Robotics',
    description: 'Build autonomous mobile robots, obstacle avoidance algorithms, PID controllers, motor driver configurations, and line follower designs using Arduino.',
    capacity: 40,
    status: 'Active',
    fee: 1799.00,
    trainer_name: 'Dr. Amit Varma',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80',
    deadline: '2026-09-10 23:59:59',
    schedule: 'Sat-Sun 09:30 AM - 04:30 PM',
    venue: 'Robotics Center, Building B'
  },
  {
    workshop_id: 5,
    title: 'Smart Home Technologies',
    description: 'Explore home automation networks, Zigbee protocols, voice assistant integration, power management relays, and secure local hub setups.',
    capacity: 35,
    status: 'Active',
    fee: 1599.00,
    trainer_name: 'Er. Vignesh Gowda',
    image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80',
    deadline: '2026-09-15 23:59:59',
    schedule: 'Mon-Tue 09:30 AM - 04:30 PM',
    venue: 'Automation Lab, 1st Floor'
  }
];

const defaultCoordinators = [
  {
    coordinator_id: 1,
    name: 'Dr. Amit Varma',
    email: 'amit.varma@sansah.edu',
    phone: '+91 98401 12345',
    department: 'Research & Robotics',
    employee_id: 'EMP-2026-089',
    role: 'Chief Coordinator',
    password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA256 of admin123
    last_login: new Date().toISOString(),
    notification_settings: { email: true, sms: true, reminders: true, alerts: true },
    login_history: [new Date().toISOString()]
  }
];

const defaultColleges = [
  { college_id: 1, name: 'Sathyabama Institute of Science and Technology', city: 'Chennai', state: 'Tamil Nadu' },
  { college_id: 2, name: 'PSG College of Technology', city: 'Coimbatore', state: 'Tamil Nadu' },
  { college_id: 3, name: 'Vellore Institute of Technology', city: 'Vellore', state: 'Tamil Nadu' },
  { college_id: 4, name: 'RV College of Engineering', city: 'Bangalore', state: 'Karnataka' },
  { college_id: 5, name: 'SRM Institute of Science and Technology', city: 'Kattankulathur', state: 'Tamil Nadu' }
];

const defaultStudents = [
  { student_id: 1, name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '9876543210', college_id: 1, branch: 'Computer Science', semester: 'Semester 5', password: 'student123' },
  { student_id: 2, name: 'Sneha Reddy', email: 'sneha.reddy@example.com', phone: '9876543211', college_id: 2, branch: 'Electronics & Communication', semester: 'Semester 7', password: 'student123' },
  { student_id: 3, name: 'Aditya Sen', email: 'aditya.sen@example.com', phone: '9876543212', college_id: 3, branch: 'Electrical Engineering', semester: 'Semester 3', password: 'student123' },
  { student_id: 4, name: 'Meera Nair', email: 'meera.nair@example.com', phone: '9876543213', college_id: 4, branch: 'Information Technology', semester: 'Semester 6', password: 'student123' },
  { student_id: 5, name: 'Vijay Kumar', email: 'vijay.kumar@example.com', phone: '9876543214', college_id: 5, branch: 'Mechatronics', semester: 'Semester 5', password: 'student123' }
];

const defaultRegistrations = [
  { registration_id: 1, student_id: 1, workshop_id: 1, team_id: null, payment_status: 'Completed', confirmation_status: 'Approved', registration_date: new Date().toISOString() },
  { registration_id: 2, student_id: 2, workshop_id: 2, team_id: null, payment_status: 'Completed', confirmation_status: 'Approved', registration_date: new Date().toISOString() },
  { registration_id: 3, student_id: 3, workshop_id: 3, team_id: null, payment_status: 'Pending', confirmation_status: 'Pending', registration_date: new Date().toISOString() },
  { registration_id: 4, student_id: 4, workshop_id: 4, team_id: null, payment_status: 'Completed', confirmation_status: 'Approved', registration_date: new Date().toISOString() },
  { registration_id: 5, student_id: 5, workshop_id: 5, team_id: null, payment_status: 'Pending', confirmation_status: 'Pending', registration_date: new Date().toISOString() }
];

const defaultHistory = [
  { history_id: 1, registration_id: 1, previous_status: 'Pending', new_status: 'Approved', changed_by: 'Admin', remarks: 'Payment verified successfully', changed_at: new Date().toISOString() },
  { history_id: 2, registration_id: 2, previous_status: 'Pending', new_status: 'Approved', changed_by: 'Admin', remarks: 'Payment verified successfully', changed_at: new Date().toISOString() },
  { history_id: 3, registration_id: 3, previous_status: null, new_status: 'Pending', changed_by: 'System', remarks: 'Registration submitted, awaiting payment', changed_at: new Date().toISOString() },
  { history_id: 4, registration_id: 4, previous_status: 'Pending', new_status: 'Approved', changed_by: 'Admin', remarks: 'Payment verified successfully', changed_at: new Date().toISOString() },
  { history_id: 5, registration_id: 5, previous_status: null, new_status: 'Pending', changed_by: 'System', remarks: 'Registration submitted, awaiting payment', changed_at: new Date().toISOString() }
];

const DB_FILE = path.join(__dirname, '../db/mockDb.json');

function saveMockDb() {
  try {
    const dataToSave = {
      db: mockDb,
      counters: mockCounters,
      fallbacks: Array.from(fallbackCollections)
    };
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save mock database:', err.message);
  }
}

function loadMockDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      Object.assign(mockDb, parsed.db || {});
      Object.assign(mockCounters, parsed.counters || {});
      if (parsed.fallbacks) {
        parsed.fallbacks.forEach(f => fallbackCollections.add(f));
      }
      console.log('ℹ️ Loaded persistent mock database from file.');
    } else {
      saveMockDb();
    }
  } catch (err) {
    console.error('Failed to load mock database:', err.message);
  }
}

function isTableMissingError(err) {
  if (!err) return false;
  const errMsg = err.message || err.details || '';
  const errCode = err.code || '';
  return (
    errCode === 'PGRST205' || 
    errMsg.includes('relation') && errMsg.includes('does not exist') ||
    errMsg.includes('Could not find the table') ||
    errMsg.includes('in the schema cache')
  );
}

function enableLocalFallback(name) {
  if (!fallbackCollections.has(name)) {
    fallbackCollections.add(name);
    if (!mockDb[name] || Object.keys(mockDb[name]).length === 0) {
      mockDb[name] = {};
      if (name === 'workshops') defaultWorkshops.forEach(w => mockDb.workshops[w.workshop_id] = w);
      else if (name === 'colleges') defaultColleges.forEach(c => mockDb.colleges[c.college_id] = c);
      else if (name === 'students') defaultStudents.forEach(s => mockDb.students[s.student_id] = s);
      else if (name === 'registrations') defaultRegistrations.forEach(r => mockDb.registrations[r.registration_id] = r);
      else if (name === 'registration_status_history') defaultHistory.forEach(h => mockDb.registration_status_history[h.history_id] = h);
      else if (name === 'coordinators') defaultCoordinators.forEach(c => mockDb.coordinators[c.coordinator_id] = c);
    }
    saveMockDb();
  }
}

// Database schema initialization
async function initDb() {
  console.log(`Initializing database schema (${db.dbType.toUpperCase()})...`);
  
  loadMockDb();

  // Ensure coordinators is seeded in local mock storage
  if (!mockDb.coordinators || Object.keys(mockDb.coordinators).length === 0) {
    mockDb.coordinators = {};
    defaultCoordinators.forEach(c => {
      mockDb.coordinators[c.coordinator_id] = c;
    });
    mockCounters.coordinators = Math.max(mockCounters.coordinators || 0, 1);
    saveMockDb();
  } else if (mockDb.coordinators['1'] && mockDb.coordinators['1'].password === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918') {
    // Correct local mock password hash from 'admin' hash to 'admin123' hash
    mockDb.coordinators['1'].password = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
    saveMockDb();
  }
  
  if (useMock) {
    if (Object.keys(mockDb.workshops || {}).length === 0) {
      console.log('ℹ️ Seeding local mock memory database with default collections.');
      
      mockDb.workshops = {}; defaultWorkshops.forEach(w => mockDb.workshops[w.workshop_id] = w);
      mockDb.colleges = {}; defaultColleges.forEach(c => mockDb.colleges[c.college_id] = c);
      mockDb.students = {}; defaultStudents.forEach(s => mockDb.students[s.student_id] = s);
      mockDb.registrations = {}; defaultRegistrations.forEach(r => mockDb.registrations[r.registration_id] = r);
      mockDb.registration_status_history = {}; defaultHistory.forEach(h => mockDb.registration_status_history[h.history_id] = h);
      mockDb.team_members = {};
      mockDb.teams = {};
      mockDb.attendance_records = {};
      mockDb.student_attendance = {};
      mockDb.project_submissions = {};
      mockDb.certificates = {};
      mockDb.coordinators = {}; defaultCoordinators.forEach(c => mockDb.coordinators[c.coordinator_id] = c);
      mockDb.notifications = {};

      mockCounters.workshops = 5;
      mockCounters.colleges = 5;
      mockCounters.students = 5;
      mockCounters.registrations = 5;
      mockCounters.registration_status_history = 5;
      mockCounters.team_members = 0;
      mockCounters.teams = 0;
      mockCounters.attendance_records = 0;
      mockCounters.student_attendance = 0;
      mockCounters.project_submissions = 0;
      mockCounters.certificates = 0;
      mockCounters.coordinators = 1;
      mockCounters.notifications = 0;
      
      saveMockDb();
      console.log('✅ Local Mock database seeded successfully.');
    } else {
      console.log('✅ Local Mock database initialized from persistent file.');
    }
    return;
  }

  try {
    const wsRef = db.collection('workshops');
    const snapshot = await wsRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log(`ℹ️ ${db.dbType.toUpperCase()} is empty. Seeding default collections and counters...`);
      


      for (const w of defaultWorkshops) {
        await wsRef.doc(String(w.workshop_id)).set(w);
      }
      for (const c of defaultColleges) {
        await db.collection('colleges').doc(String(c.college_id)).set(c);
      }
      for (const s of defaultStudents) {
        await db.collection('students').doc(String(s.student_id)).set(s);
      }
      for (const r of defaultRegistrations) {
        await db.collection('registrations').doc(String(r.registration_id)).set(r);
      }
      for (const h of defaultHistory) {
        await db.collection('registration_status_history').doc(String(h.history_id)).set(h);
      }
      console.log(`✅ ${db.dbType.toUpperCase()} database seeded with default collections successfully.`);
    } else {
      console.log(`ℹ️ Database already has workshops. Skipping ${db.dbType.toUpperCase()} seed.`);
    }

    // Seed default coordinator in Supabase
    const coordRef = db.collection('coordinators');
    const existingDoc = await coordRef.doc('1').get();
    if (!existingDoc.exists) {
      console.log('ℹ️ Seeding default coordinator in Supabase...');
      await coordRef.doc('1').set({
        coordinator_id: 1,
        name: 'Dr. Amit Varma',
        email: 'amit.varma@sansah.edu',
        phone: '+91 98401 12345',
        department: 'Research & Robotics',
        employee_id: 'EMP-2026-089',
        role: 'Chief Coordinator',
        password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        last_login: new Date().toISOString(),
        notification_settings: { email: true, sms: true, reminders: true, alerts: true },
        login_history: [new Date().toISOString()]
      });
    } else if (existingDoc.data().password === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918') {
      console.log('ℹ️ Correcting default coordinator password hash in Supabase...');
      await coordRef.doc('1').update({
        password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
      });
    }
  } catch (error) {
    console.error(`❌ Failed to initialize and seed ${db.dbType.toUpperCase()} database:`, error);
  }
}

// Attach custom properties to the db object
db.query = query;
db.initDb = initDb;
db.getNextId = getNextId;
db.getIdField = getIdField;
db.dbType = useMock ? 'mock-supabase' : 'supabase';

module.exports = db;
