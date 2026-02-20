import * as db from './server/db.js';

async function deleteTestSponsor() {
  try {
    // Find Test sponsor
    const sponsors = await db.getAllSponsors();
    const testSponsor = sponsors.find(s => s.companyName === 'Test' && s.contactEmail === 'bobby@recruitmentevents.co');
    
    if (testSponsor) {
      console.log(`Found Test sponsor with ID: ${testSponsor.id}`);
      await db.deleteSponsor(testSponsor.id);
      console.log('Test sponsor deleted successfully');
    } else {
      console.log('Test sponsor not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

deleteTestSponsor();
