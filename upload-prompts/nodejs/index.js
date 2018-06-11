const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');
const request = require('request-promise');

// Get client credentials from environment variables
const PURECLOUD_CLIENT_ID = process.env.PURECLOUD_CLIENT_ID;
const PURECLOUD_CLIENT_SECRET = process.env.PURECLOUD_CLIENT_SECRET;

// Set purecloud objects
const client = platformClient.ApiClient.instance;
const architectApi = new platformClient.ArchitectApi();

// Set PureCloud settings
client.setEnvironment('mypurecloud.com');

// Authenticate with PureCloud
client.loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)
	.then(() => {
		console.log('Authenticated with PureCloud');

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
