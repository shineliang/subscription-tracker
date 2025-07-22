const axios = require('axios');

async function testAnalysisAPI() {
  try {
    // Test optimization suggestions endpoint
    const response = await axios.get('http://localhost:5200/api/analysis/optimization-suggestions', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3MjE1NDI1MzAsImV4cCI6MTcyMjE0NzMzMH0.g5vXb0yKLCXlRs9GiqJ5FWMhZQ6Vu5xBqxDeFpurPos'
      }
    });
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    // Check totalPotentialSavings specifically
    if (response.data.suggestions) {
      console.log('\ntotalPotentialSavings:', response.data.suggestions.totalPotentialSavings);
      console.log('Type:', typeof response.data.suggestions.totalPotentialSavings);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAnalysisAPI();