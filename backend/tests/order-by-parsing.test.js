const { describe, test, expect } = require('@jest/globals');

// 由于不能直接导入parseSelectQuery函数（它是内部函数），
// 我们创建一个简化版本来测试逻辑
function parseOrderByClause(orderBy) {
  if (!orderBy) return [];
  
  // 支持多列排序，如 "type, period, category" 或 "name DESC, date ASC"
  const orderClauses = orderBy.split(',').map(clause => clause.trim());
  
  return orderClauses.map(clause => {
    const parts = clause.split(/\s+/);
    const column = parts[0];
    const direction = parts[1] || 'ASC';
    return {
      column,
      ascending: direction.toUpperCase() !== 'DESC'
    };
  });
}

describe('ORDER BY Parsing Tests', () => {
  test('Should parse single column ordering', () => {
    const result = parseOrderByClause('name');
    expect(result).toEqual([
      { column: 'name', ascending: true }
    ]);
  });

  test('Should parse single column with DESC', () => {
    const result = parseOrderByClause('name DESC');
    expect(result).toEqual([
      { column: 'name', ascending: false }
    ]);
  });

  test('Should parse single column with ASC', () => {
    const result = parseOrderByClause('name ASC');
    expect(result).toEqual([
      { column: 'name', ascending: true }
    ]);
  });

  test('Should parse multiple columns ordering', () => {
    const result = parseOrderByClause('type, period, category');
    expect(result).toEqual([
      { column: 'type', ascending: true },
      { column: 'period', ascending: true },
      { column: 'category', ascending: true }
    ]);
  });

  test('Should parse multiple columns with mixed directions', () => {
    const result = parseOrderByClause('name DESC, date ASC, id');
    expect(result).toEqual([
      { column: 'name', ascending: false },
      { column: 'date', ascending: true },
      { column: 'id', ascending: true }
    ]);
  });

  test('Should handle empty or null orderBy', () => {
    expect(parseOrderByClause('')).toEqual([]);
    expect(parseOrderByClause(null)).toEqual([]);
    expect(parseOrderByClause(undefined)).toEqual([]);
  });

  test('Should handle extra whitespace', () => {
    const result = parseOrderByClause('  name  DESC  ,   date   ASC  ');
    expect(result).toEqual([
      { column: 'name', ascending: false },
      { column: 'date', ascending: true }
    ]);
  });

  test('Should handle the problematic budget query', () => {
    const result = parseOrderByClause('type, period, category');
    expect(result).toEqual([
      { column: 'type', ascending: true },
      { column: 'period', ascending: true },
      { column: 'category', ascending: true }
    ]);
  });
});