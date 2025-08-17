const db = require('../db/database');
require('dotenv').config();

describe('Supabase Database Connection Tests', () => {
  
  test('Database connection should be established', async () => {
    const testConnection = () => {
      return new Promise((resolve, reject) => {
        db.get('SELECT NOW() as current_time', (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
    
    const result = await testConnection();
    expect(result).toBeDefined();
    expect(result.current_time).toBeDefined();
  });
  
  test('Should be able to query users table', async () => {
    const queryUsers = () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT COUNT(*) as count FROM users', (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
    
    const result = await queryUsers();
    expect(result).toBeDefined();
    expect(result[0]).toHaveProperty('count');
  });
  
  test('Should be able to query subscriptions table', async () => {
    const querySubscriptions = () => {
      return new Promise((resolve, reject) => {
        db.all('SELECT COUNT(*) as count FROM subscriptions', (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
    
    const result = await querySubscriptions();
    expect(result).toBeDefined();
    expect(result[0]).toHaveProperty('count');
  });
  
  test('Should be able to insert and delete test data', async () => {
    // Insert test user
    const insertUser = () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
          ['testuser_' + Date.now(), 'test' + Date.now() + '@test.com', 'testhash'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    };
    
    const userId = await insertUser();
    expect(userId).toBeDefined();
    expect(userId).toBeGreaterThan(0);
    
    // Delete test user
    const deleteUser = () => {
      return new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM users WHERE id = $1',
          [userId],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
    };
    
    const changes = await deleteUser();
    expect(changes).toBe(1);
  });
  
  test('Should handle transactions correctly', async () => {
    const runTransaction = () => {
      return new Promise(async (resolve, reject) => {
        try {
          // Start transaction
          await new Promise((res, rej) => {
            db.run('BEGIN', (err) => err ? rej(err) : res());
          });
          
          // Insert test data
          const userId = await new Promise((res, rej) => {
            db.run(
              'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
              ['txnuser_' + Date.now(), 'txn' + Date.now() + '@test.com', 'txnhash'],
              function(err) {
                if (err) rej(err);
                else res(this.lastID);
              }
            );
          });
          
          // Rollback transaction
          await new Promise((res, rej) => {
            db.run('ROLLBACK', (err) => err ? rej(err) : res());
          });
          
          // Check if user was not persisted
          const user = await new Promise((res, rej) => {
            db.get('SELECT * FROM users WHERE id = $1', [userId], (err, result) => {
              if (err) rej(err);
              else res(result);
            });
          });
          
          resolve(user);
        } catch (err) {
          reject(err);
        }
      });
    };
    
    const user = await runTransaction();
    expect(user).toBeNull();
  });
  
  afterAll(async () => {
    // Clean up any test data
    await new Promise((resolve) => {
      db.run("DELETE FROM users WHERE username LIKE 'testuser_%' OR username LIKE 'txnuser_%'", resolve);
    });
    
    // Close database connection
    await db.close();
  });
});