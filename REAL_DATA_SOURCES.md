# Real Doctor Data Sources for DOCTOR_SEARCH

## IMPORTANT: Real Data Only Policy

This application contains ONLY verified, real doctor information from authorized sources.

**NO fabricated, sample, or test data is acceptable.**

## Authorized Real Data Sources in India

### 1. National Medical Commission (NMC)
- **Official Website**: https://nmc.org.in
- **Purpose**: Regulatory body for medical professionals in India
- **Data Available**: 
  - Registered doctors with registration numbers
  - Specializations
  - Registration years
  - State councils that registered them
- **Access Method**: 
  - Public doctor verification portal at https://nmc.org.in/doctor-search
  - Search by name or registration number
  - Can verify individual doctors
- **API Available**: Check if NMC provides bulk export or API access
- **Limitations**: 
  - Cannot directly scrape without permission
  - Phone/email/clinic details usually not in public register
  - Appointment availability not in official register
  - Consultation fees not in official register

### 2. ABDM - Ayushman Bharat Digital Mission
- **Official Website**: https://abdm.gov.in
- **Purpose**: National health digital mission
- **Healthcare Professionals Registry**: 
  - Registry of healthcare professionals
  - May include doctor contact information
  - May include clinic/hospital affiliations
- **Access Method**: 
  - Check for public API or data download options
  - May require authorization/registration
- **Data Available**: 
  - Doctor details
  - Registration information
  - Clinic/hospital associations

### 3. State Medical Councils
- **Purpose**: Regulate doctors at state level
- **Examples**:
  - Madhya Pradesh Medical Council (MPMC)
  - Maharashtra Medical Council (MMC)
  - Delhi Medical Council (DMC)
  - Tamil Nadu Medical Council (TNMC)
  - Others for each state
- **Access Method**: 
  - Visit individual state council website
  - Look for doctor registry/search
  - Request data download if available
  - Contact council for bulk data access
- **Data Available**:
  - Registered doctors in that state
  - Registration numbers and years
  - Specializations

### 4. Hospital and Clinic Direct Data
- **Source**: Official hospital/clinic websites and verification
- **Method**:
  - Contact hospitals directly for authorized doctor lists
  - Obtain verified clinic information
  - Request permission to publish doctor details
  - Verify consultation fees, availability, contact info directly
- **Data Available**:
  - Doctor names and qualifications
  - Specializations
  - Clinic addresses
  - Contact information
  - Appointment availability (if clinic provides)
  - Consultation fees

## Data Collection Process

### Step 1: Identify Authoritative Source
Before importing ANY doctor data:
1. Identify where the data comes from
2. Verify it's from an official/authorized source
3. Check if usage rights permit redistribution
4. Ensure no terms of service violations
5. Confirm no scraping/CAPTCHA bypass needed

### Step 2: Verify Each Record
For each doctor record to import:
1. Cross-reference with NMC/State Council register
2. Confirm registration number is valid
3. Confirm specialization matches official record
4. For clinic details: obtain written authorization from clinic
5. For phone/email: confirm it's publicly authorized to publish
6. For appointment availability: get from official clinic system
7. For fees: confirm from official clinic source

### Step 3: Document Source
Create CSV with columns:
```
name, registrationNumber, registrationYear, registeredCouncil, 
qualifications, specialization, subSpecialization, 
state, city, district, 
hospitalOrClinic, clinicAddress, 
consultationFee, phone, email, 
availableDays, availableTimeSlots, appointmentBookingAvailable, 
dataSource
```

### Step 4: Import Using Script
```bash
node import-real-data.js real-doctors.csv
```

## Important Rules

### DO:
- ✓ Use official government/authorized sources
- ✓ Verify each record individually
- ✓ Document your source
- ✓ Leave fields empty/null if not verified
- ✓ Mark verificationStatus as "verified" ONLY for verified data
- ✓ Store dataSource reference for traceability
- ✓ Get explicit permission before publishing personal details

### DO NOT:
- ✗ Create fake doctors
- ✗ Guess missing information
- ✗ Scrape websites that prohibit it
- ✗ Bypass CAPTCHA or authentication
- ✗ Use unverified sources
- ✗ Claim data is "verified" unless official source confirms it
- ✗ Publish phone/email without authorization
- ✗ Claim appointment availability without clinic confirmation
- ✗ Invent consultation fees

## Current Database Status

### Doctors Currently Available
- **Count**: 0
- **Status**: No verified doctors loaded yet
- **Reason**: Awaiting authorized real data source

### When Data Will Be Available
Real doctor data will be added when:
1. An authorized source (NMC/ABDM/State Council) provides data access
2. Each record is individually verified
3. All data can be legally redistributed
4. Source information is documented

## Limitations

### What We Cannot Do Without Permission
1. **Cannot scrape websites** - Many hospital/council websites prohibit automated access
2. **Cannot use leaked datasets** - Medical data requires authorization
3. **Cannot guess missing data** - Clinic info, fees, availability must be verified
4. **Cannot claim nationwide coverage** - Unless we have source covering all India
5. **Cannot publish private contact info** - Only publicly authorized data

### What Is Currently Unavailable
- **Appointment Slots**: Not in official medical registers
- **Consultation Fees**: Not in official registers (clinic-specific)
- **Phone/Email**: Not publicly listed in official registers
- **Real-time Availability**: Requires active clinic system access
- **Profile Photos**: Need separate image licensing/permissions

## Import Examples

### Example 1: State Medical Council Data
If Madhya Pradesh Medical Council provides an authorized export:
```csv
"Dr. Rajesh Kumar","MP0012345","2010","Madhya Pradesh Medical Council","MBBS;MD Cardiology","Cardiologist","Interventional Cardiology","Madhya Pradesh","Bhopal","Bhopal","","","","","","","","false","https://mpmc.org.in/register"
```

### Example 2: Hospital Authorized List
If a hospital provides authorized doctor list with permission:
```csv
"Dr. Priya Singh","MCI9876543","2012","Medical Council of India","MBBS;MS Gynecology","Gynecologist","","Maharashtra","Mumbai","Mumbai","Apollo Hospital Mumbai","123 Medical Plaza, Mumbai","500","98765432100","dr.priya@apollo.com","Monday;Tuesday;Wednesday;Thursday;Friday","9:00 AM;10:00 AM;2:00 PM;3:00 PM;4:00 PM","true","Apollo Hospital Authorized List - 2024"
```

## Technical Implementation

### Database Field: dataSource
This field stores the origin of each record:
- URL of official register
- Name of authorizing body
- Date of verification
- Any reference ID from source

### Database Field: verificationStatus
States:
- `verified` - Confirmed against authoritative source
- `pending` - Awaiting verification
- `unverified` - Not yet verified (should not be shown)

### Database Field: lastVerifiedAt
When this record was last confirmed against authoritative source.

## Getting Help

If you want to contribute real doctor data:
1. Identify your authorized source
2. Obtain necessary permissions
3. Create CSV file following template
4. Verify each record personally
5. Document your source
6. Submit import via: `node import-real-data.js your-file.csv`

## Legal & Privacy Considerations

- **Medical Privacy**: Respect doctor and patient privacy
- **Data Rights**: Only use data you have legal right to use
- **Terms of Service**: Honor website/API terms of service
- **Attribution**: Credit and link to original source
- **GDPR/Data Laws**: Comply with applicable regulations

## Contact & Feedback

For questions about real data sources or verification:
- Check official NMC website: https://nmc.org.in
- Contact your State Medical Council
- Request data from hospitals directly
- Never guess or fabricate information

---

**Last Updated**: 2025
**Status**: Database contains 0 verified doctors - awaiting authorized real data source
