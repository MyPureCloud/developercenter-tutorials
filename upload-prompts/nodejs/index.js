const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');
const request = require('request-promise');

// Get client credentials from environment variables
const GENESYS_CLOUD_CLIENT_ID = process.env.GENESYS_CLOUD_CLIENT_ID;
const GENESYS_CLOUD_CLIENT_SECRET = process.env.GENESYS_CLOUD_CLIENT_SECRET;

// Set Genesys Cloud objects
const client = platformClient.ApiClient.instance;
const architectApi = new platformClient.ArchitectApi();

// Set Genesys Cloud settings
client.setEnvironment('mypurecloud.com');

// Authenticate with Genesys Cloud
client.loginClientCredentialsGrant(GENESYS_CLOUD_CLIENT_ID, GENESYS_CLOUD_CLIENT_SECRET)
	.then(() => {
		console.log('Authenticated with Genesys Cloud');

		// Create new prompt
		console.log('Creating new prompt...');
		return architectApi.postArchitectPrompts({ 
			body: {
				name: 'uploaded_prompt',
				description: 'Prompt uploaded by upload-prompts example app'
			}
		});
	})
	.then((prompt) => {
		console.log(prompt);

		// Create prompt resource for english
		console.log('Creating prompt resource...');
		return architectApi.postArchitectPromptResources(prompt, { 
			body: {
				language: 'en-us'
			}
		});
	})
	.then((promptResource) => {
		console.log(promptResource);

		// Upload WAV file to prompt
		console.log('Uploading prompt...');
		return request({
			method: 'POST',
			uri: promptResource.uploadUri,
			formData: {
				file: fs.createReadStream('../prompt-example.wav')
			},
			headers: {
				Authorization: 'bearer ' + client.authData.accessToken
			}
		});
	})
	.then((res) => {
		console.log('Upload complete. Review your prompt in architect.');
		console.log('https://apps.mypurecloud.com/architect/#/call/userprompts');
		console.log(res);
	})
	.catch((err) => console.log(err));
