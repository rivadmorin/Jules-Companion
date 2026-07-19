import { getApiKey, getSessions, request } from './jules_client';

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found.');
    process.exit(1);
  }

  const sessionsList = getSessions();
  if (sessionsList.length === 0) {
    console.log('No registered sessions found.');
    return;
  }

  const headers = { 'X-Goog-Api-Key': apiKey };

  console.log('=== AUTO-PROCESSING JULES SESSIONS ===');
  for (const s of sessionsList) {
    const url = `https://jules.googleapis.com/v1alpha/sessions/${s.id}`;
    try {
      const data = await request(url, { headers });
      if (data.state === 'AWAITING_USER_INPUT') {
        console.log(`\nSession ${s.agent} (${s.id}) is AWAITING_USER_INPUT.`);
        
        // Fetch last activity
        const actUrl = `https://jules.googleapis.com/v1alpha/sessions/${s.id}/activities`;
        const actData = await request(actUrl, { headers });
        const activities = actData.activities || [];
        const lastAct = activities[0];
        
        let message = 'Please proceed autonomously with the implementation.';
        if (lastAct && lastAct.progressUpdated) {
          message = 'Plan approved. Please proceed with the implementation.';
        }
        
        console.log(`Sending response: "${message}"`);
        const replyUrl = `https://jules.googleapis.com/v1alpha/sessions/${s.id}:sendMessage`;
        await request(replyUrl, { method: 'POST', headers }, { prompt: message });
        console.log(`Approved/replied to session ${s.agent}.`);
      }
    } catch (e: any) {
      console.error(`Error processing ${s.agent} (${s.id}): ${e.message}`);
    }
  }
  console.log('\nAuto-processing complete.');
}

if (require.main === module) {
  main();
}
