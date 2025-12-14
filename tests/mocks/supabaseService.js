// Mock SupabaseService for testing
let mockData = {
  areas: []
};

let shouldReturnClient = true;

export const SupabaseService = {
  getClient() {
    if (!shouldReturnClient) return null;
    
    return {
      from(table) {
        return {
          select(columns = '*') {
            return {
              order(column) {
                return {
                  then: (resolve) => resolve({ data: mockData[table] || [], error: null })
                };
              },
              single() {
                const data = mockData[table] && mockData[table].length > 0 ? mockData[table][0] : null;
                return { data, error: data ? null : new Error('No data found') };
              }
            };
          },
          insert(data) {
            return {
              select() {
                return {
                  single() {
                    const newItem = { 
                      id: crypto.randomUUID(), 
                      ...data[0], 
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    mockData[table] = [...(mockData[table] || []), newItem];
                    return { data: newItem, error: null };
                  }
                };
              }
            };
          },
          update(updateData) {
            return {
              eq(column, value) {
                return {
                  select() {
                    return {
                      single() {
                        const items = mockData[table] || [];
                        const index = items.findIndex(item => item[column] === value);
                        if (index !== -1) {
                          items[index] = { ...items[index], ...updateData };
                          return { data: items[index], error: null };
                        }
                        return { data: null, error: new Error('Item not found') };
                      }
                    };
                  }
                };
              }
            };
          },
          delete() {
            return {
              eq(column, value) {
                const items = mockData[table] || [];
                mockData[table] = items.filter(item => item[column] !== value);
                return { data: null, error: null };
              }
            };
          }
        };
      }
    };
  },
  
  // Test utilities
  _setMockData(table, data) {
    mockData[table] = data;
  },
  
  _getMockData(table) {
    return mockData[table] || [];
  },
  
  _reset() {
    mockData = { areas: [] };
    shouldReturnClient = true;
  },
  
  _setClientAvailable(available) {
    shouldReturnClient = available;
  }
};