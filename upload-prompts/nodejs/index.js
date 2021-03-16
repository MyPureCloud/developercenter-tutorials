const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');
const axios = require('axios');   
const FormData = require('form-data');

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
				name: 'uploaded_prompt',
				description: 'Prompt uploaded by upload-prompts example app'
		});
	})
	.then((prompt) => {
		console.log(prompt);

		// Create prompt resource for english
		console.log('Creating prompt resource...');
		return architectApi.postArchitectPromptResources(prompt.id, { 
				language: 'en-us'
		});
	})
	.then((promptResource) => {
		console.log(promptResource);
		console.log('Uploading prompt...');

		const form = new FormData();
		form.append('file', fs.createReadStream('../prompt-example.wav'));

		return axios.post(promptResource.uploadUri, form, {
			headers: {
				'Authorization': 'bearer ' + client.authData.accessToken,
				...form.getHeaders()
			}
		});
	})
	.then((res) => {
		console.log('Upload complete. Review your prompt in architect.');
		console.log('https://apps.mypurecloud.com/architect/#/call/userprompts');
		console.log(res.data);
	})
	.catch((err) => console.log(err));
