const http = require('http');

const doctorId = '6aa15718c157aa75151a631c';
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const data = JSON.stringify({
  doctorId,
  patientName: 'Test Patient',
  patientEmail: 'test@example.com',
  patientPhone: '9876543210',
  appointmentDate: futureDate,
  timeSlot: '10:00 AM',
  notes: 'Test appointment request'
});

const opts = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/appointments',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(opts, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('Response:');
    const json = JSON.parse(responseData);
    console.log(JSON.stringify(json, null, 2));
    console.log('\n✓ Status:', res.statusCode);
    console.log('✓ Appointment Status:', json.data?.status);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
