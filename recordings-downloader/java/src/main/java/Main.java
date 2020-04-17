import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.api.ConversationsApi;
import com.mypurecloud.sdk.v2.api.RecordingApi;
import com.mypurecloud.sdk.v2.model.*;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.ApiResponse;
import com.mypurecloud.sdk.v2.ApiException;
import com.mypurecloud.sdk.v2.extensions.AuthResponse;

import java.io.*;
import java.net.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.*;


/**
 * This sample uses lambda functions (Java 8+ is required)
 */

public class Main {
    private static ConversationsApi conversationsApi;
    private static RecordingApi recordingApi;
    private static ApiClient apiClient;
    private static String clientId;
    private static String clientSecret;
    private static String dates;

    private static void authenticate(){
        System.out.println("authenticate");
        // Input
        Scanner s = new Scanner(System.in);
        System.out.print("Client ID: ");
        clientId = s.nextLine();
        System.out.print("Client secret: ");
        clientSecret = s.nextLine();
        System.out.print("Dates: ");
        dates = s.nextLine();

        //Set Region
        PureCloudRegionHosts region = PureCloudRegionHosts.us_east_1;

        apiClient = ApiClient.Builder.standard().withBasePath(region).build();
        try {
            ApiResponse<AuthResponse> authResponse = apiClient.authorizeClientCredentials(clientId, clientSecret);
        } catch (Exception e){
            System.err.println("Exception when authenticating.");
            e.printStackTrace();
            System.out.println(((ApiException)e).getRawBody());
        }

        // Use the ApiClient instance
        Configuration.setDefaultApiClient(apiClient);

        // Create API instances
        conversationsApi = new ConversationsApi();
        recordingApi = new RecordingApi();
    }

    private static void downloadConversations(String dates){
        System.out.println("downloadConversations");

        // Call conversation API, pass date inputted to extract conversationIds needed
        try {
            ConversationQuery body = new ConversationQuery().interval(dates);
            AnalyticsConversationQueryResponse result = conversationsApi.postAnalyticsConversationsDetailsQuery(body);
            extractConversationDetails(result);
        } catch (Exception e) {
            System.err.println("Exception when calling ConversationsApi#postAnalyticsConversationsDetailsQuery");
            e.printStackTrace();
            System.out.println(((ApiException)e).getRawBody());
        }
    }

    // Format conversation details to object inside and array. Get every mediatype per conversation
    private static void extractConversationDetails(AnalyticsConversationQueryResponse conversationDetails){
        System.out.println("extractConversationDetails");


        // Create conversationIds array to store all conversationId
        ArrayList<String> conversationIds = new ArrayList<String>();
        conversationDetails.getConversations().forEach((c) -> conversationIds.add(c.getConversationId()));

        // Call getRecordingMetaData function through all IDs
        conversationIds.forEach((c) -> getRecordingMetaData(c));
    }

    // Generate recordingId for every conversationId
    private static void getRecordingMetaData(String conversationId){
        System.out.println("getRecordingMetaData");


        try {
            List<Recording> result = recordingApi.getConversationRecordingmetadata(conversationId);

            // Iterate through every result, check if there are one or more recordingIds in every conversation
            result.forEach((r) -> getSpecificRecordings(r));
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#getConversationRecordingmetadata");
            e.printStackTrace();
            System.out.println(((ApiException)e).getRawBody());
        }
    }

    // Plot conversationId and recordingId to request for batchdownload Recordings
    private static void getSpecificRecordings(Recording recording){
        System.out.println("getSpecificRecordings");

        BatchDownloadRequest batchRequest = new BatchDownloadRequest()
                                                    .conversationId(recording.getConversationId())
                                                    .recordingId(recording.getId());
        List<BatchDownloadRequest> batchRequestList = new ArrayList<>();
        batchRequestList.add(batchRequest);
        BatchDownloadJobSubmission body = new BatchDownloadJobSubmission().batchDownloadRequestList(batchRequestList);

        try {
            BatchDownloadJobSubmissionResult result = recordingApi.postRecordingBatchrequests(body);
            recordingStatus(result);
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#postRecordingBatchrequests");
            e.printStackTrace();
            System.out.println(((ApiException)e).getRawBody());
        }
    }

    // Plot conversationId and recordingId to request for batchdownload Recordings
    private static void recordingStatus(BatchDownloadJobSubmissionResult recordingBatchRequest){
        System.out.println("recordingStatus");


        try {
            BatchDownloadJobStatusResult result = recordingApi.getRecordingBatchrequest(recordingBatchRequest.getId());
            if(result.getExpectedResultCount() == result.getResultCount()){
                getExtension(result);
            } else {
                Thread.sleep(5000);
                recordingStatus(recordingBatchRequest);
            }
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#getRecordingBatchrequest");
            e.printStackTrace();
            System.out.println(((ApiException)e).getRawBody());
        }
    }

    // Get extension of every recordings
    private static void getExtension(BatchDownloadJobStatusResult batchRequestData) throws IOException {
        System.out.println("getExtension");


        // Store the content type to a variable that will be used later to determine the extension of recordings.
        String contentType = batchRequestData.getResults().get(0).getContentType();

        // Slice the text and gets the extension that will be used for the recording
        String ext = contentType.substring(contentType.lastIndexOf("/") + 1);

        downloadRecording(ext, batchRequestData);
    }

    // Download Recordings
    private static void downloadRecording(String ext, BatchDownloadJobStatusResult batchRequestData)
            throws IOException
    {
        System.out.println("Processing please wait...");

        String conversationId = batchRequestData.getResults().get(0).getConversationId();
        String recordingId = batchRequestData.getResults().get(0).getRecordingId();
        String sourceURL = batchRequestData.getResults().get(0).getResultUrl();

        String targetDirectory = "./";

        URL url = new URL(sourceURL);
        String fileName = conversationId + "_" + recordingId;
        Path targetPath = new File(targetDirectory + File.separator + fileName + "." + ext).toPath();
        Files.copy(url.openStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
    }

    public static void main(String[] args){
        authenticate();
        downloadConversations(dates);
    }
}
