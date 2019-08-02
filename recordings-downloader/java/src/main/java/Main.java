package main.java;

import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.ApiException;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.api.ConversationsApi;
import com.mypurecloud.sdk.v2.api.RecordingApi;
import com.mypurecloud.sdk.v2.model.*;
import com.mypurecloud.sdk.v2.model.AnalyticsSession.MediaTypeEnum;

import java.io.*;
import java.net.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) throws ApiException, IOException, InterruptedException {
        Scanner s = new Scanner(System.in);

        //OAuth Input
        System.out.print("Enter Client ID: ");
        String clientId = s.nextLine();
        System.out.print("Enter Client Secret: ");
        String clientSecret = s.nextLine();

        //Get the Date Interval
        System.out.println("Enter Date Interval (YYYY-MM-DDThh:mm:ss/YYYY-MM-DDThh:mm:ss): ");
        String interval = s.nextLine();

        System.out.println("Working...");

        // Configure SDK settings
        String accessToken = getToken(clientId, clientSecret);
        Configuration.setDefaultApiClient(ApiClient.Builder.standard()
                .withAccessToken(accessToken)
                .withBasePath("https://api.mypurecloud.com")
                .build());

        // Instantiate APIs
        ConversationsApi conversationsApi = new ConversationsApi();
        RecordingApi recordingApi = new RecordingApi();

        // Get Conversation IDs and corresponding Media Type within a date interval
        HashMap<String, MediaTypeEnum> conversationsMapIDType = getConversations(interval, conversationsApi);

        // Use the Conversation IDs and request a batch download for the conversations.
        String jobID = requestBatchDownload(new ArrayList<String>(conversationsMapIDType.keySet()), recordingApi);

        // Get all conversations with recordings
        List<BatchDownloadJobResult> jobResults = getJobResults(jobID, recordingApi);

        // Download all the recordings and separate into folders named after the Conversation ID
        System.out.println("Currently Downloading...");
        for(BatchDownloadJobResult j: jobResults){
            // Create the directories for each unique Conversation IDs
            new File("./recordings/" + j.getConversationId()).mkdirs();

            // Determine the file extension to assign
            String extension = getExtensionFromMediaType(conversationsMapIDType.get(j.getConversationId()));

            // Download the recording to appropriate folder
            downloadRecording(j.getResultUrl(), "./recordings/" + j.getConversationId(), extension);
        }

        // Final Output
        System.out.println("DONE");
    }

    /**
     * Get the conversation made within a specified duration. MediaType will be determined by media type of
     * the first session in the conversation.
     * @param interval  string interval with format YYYY-MM-DDThh:mm:ss/YYYY-MM-DDThh:mm:ss
     * @param api       conversations API to be used
     * @return          Map that cocntains Conversations information
     *                  K: Conversation ID, V: MediaType
     */
    private static HashMap<String, MediaTypeEnum> getConversations(String interval, ConversationsApi api) throws ApiException, IOException
    {
        // Request the list of conversations
        List<AnalyticsConversation> conversations = api.postAnalyticsConversationsDetailsQuery(new ConversationQuery().interval(interval)).getConversations();

        // HashMap to contain the conversations and media types.
        HashMap<String, MediaTypeEnum> conversationsMap = new HashMap<>();

        // Store the conversation IDs and the corresponding media type
        for(AnalyticsConversation c : conversations){
            conversationsMap.put(c.getConversationId(), c.getParticipants().get(0).getSessions().get(0).getMediaType());
        }

        return conversationsMap;
    }

    /**
     * Request a job to download recordings assosciated with the specified conversations
     * @param conversationIDs   List of conversations ids to request recocrdings from
     * @param api               RecordingApi instance to use
     * @return                  ID of the batch download request job
     */
    private static String requestBatchDownload(List<String> conversationIDs, RecordingApi api) throws ApiException, IOException
    {
        // Convert List of Strings to List of BatchDownloadRequests
        List<BatchDownloadRequest> batchRequests = conversationIDs.stream()
                                                                  .map(c -> new BatchDownloadRequest().conversationId(c))
                                                                  .collect(Collectors.toList());

        // Create the batch job with the request list
        BatchDownloadJobSubmission batchSubmission = new BatchDownloadJobSubmission().batchDownloadRequestList(batchRequests);

        return api.postRecordingBatchrequests(batchSubmission).getId();
    }

    /**
     * Get the results of the batch job with recording urls
     * @param jobID ID of the batch request download job
     * @param api   RecordingAPI instance to use
     * @return      List of BatchDownloadJobResults with Recordings URLs
     */
    private static List<BatchDownloadJobResult> getJobResults(String jobID, RecordingApi api)
            throws ApiException, IOException, InterruptedException
    {
        int expectedCount = api.getRecordingBatchrequest(jobID).getExpectedResultCount();
        int resultCount = 0;

        // Concurrently update every 5 seconds if job has finished processing.
        do{
            Thread.sleep(5000);
            resultCount = api.getRecordingBatchrequest(jobID).getResultCount();
            System.out.println("Processed: " + resultCount + " / " + expectedCount);
        }while(resultCount < expectedCount);

        // Filter the list to only include those with recording urls
        return api.getRecordingBatchrequest(jobID).getResults()
                .stream()
                .filter(j -> j.getResultUrl() != null)
                .collect(Collectors.toList());
    }

    /**
     * Download the recording as a wav file
     * @param sourceURL         The URL of the recording
     * @param targetDirectory   Path to save the file
     * @param extension         File extension (Ex: .wav, .txt...)
     */
    private static void downloadRecording(String sourceURL, String targetDirectory, String extension) throws IOException
    {
        URL url = new URL(sourceURL);
        String fileName = sourceURL.substring(sourceURL.lastIndexOf('/') + 1, sourceURL.indexOf('?'));
        Path targetPath = new File(targetDirectory + File.separator + fileName + extension).toPath();
        Files.copy(url.openStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
    }

    /**
     * Get the appropriate extension from the given Media Type
     * @param mediaType     Media type of the file/conversation
     * @return              Appropriate extension for the file (Ex: .wav, .txt, etc.)
     */
    private static String getExtensionFromMediaType(MediaTypeEnum mediaType){
        switch(mediaType){
            case VOICE:
                return ".wav";
            case CHAT: case EMAIL:
                return ".txt";
            default:
                return "";
        }
    }

    /**
     * Request client credentials token from PureCloud
     * @param clientId 		OAuth clientid
     * @param clientSecret  OAuth client secret
     * @return String		access token
     */
    private static String getToken(String clientId, String clientSecret)throws IOException {
        String token = "";

        // Token Request info + encoded client credentials
        String url = "https://login.mypurecloud.com/oauth/token";
        String credentials = clientId + ":" + clientSecret;
        String encodedCredentials = Base64.getEncoder().encodeToString(credentials.getBytes());

        // Build HTTP Request Information
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.setRequestProperty("Authorization", "Basic " + encodedCredentials);
        connection.setDoOutput(true);

        // HTTP Request Body
        DataOutputStream wr = new DataOutputStream(connection.getOutputStream());
        wr.writeBytes("grant_type=client_credentials");
        wr.close();

        // Check if HTTP Response is successful
        if(connection.getResponseCode() == 200) {
            InputStream response = connection.getInputStream();

            // Convert the InputStream to a String
            Scanner s = new Scanner(response).useDelimiter("\\A");
            String responseString =  s.hasNext() ? s.next() : "";

            // Manual way of extracting token from response string
            // In practical applications, use a proper JSON parser for handling the response body.
            token = responseString.substring(responseString.indexOf(':')+2,
                    responseString.indexOf(',')-1).trim();
        }

        return token;
    }
}
