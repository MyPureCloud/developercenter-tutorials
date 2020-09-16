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

    private static void downloadAllRecordings(String dates){
        System.out.println("Start batch request process.");
        BatchDownloadJobStatusResult completedBatchStatus = new BatchDownloadJobStatusResult();

        // Process and build the request for downloading the recordings
        try {
            // Get the conversations within the date interval and start adding them to batch request
            ConversationQuery body = new ConversationQuery().interval(dates);
            AnalyticsConversationQueryResponse result = conversationsApi.postAnalyticsConversationsDetailsQuery(body);

            result.getConversations().forEach((c) -> addConversationRecordingsToBatch(c.getConversationId()));
        } catch (Exception e) {
            System.err.println("Exception when calling ConversationsApi#postAnalyticsConversationsDetailsQuery");
            e.printStackTrace();
        }

        // Send a batch request and start polling for updates
        try {
            BatchDownloadJobSubmissionResult result = recordingApi.postRecordingBatchrequests(batchRequestBody);
            completedBatchStatus = getRecordingStatus(result);
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#postRecordingBatchrequests");
            e.printStackTrace();
        }

        // Start downloading the recording files individually
        completedBatchStatus.getResults().forEach((recording) -> downloadRecording(recording));
    }


    // Get all the recordings metadata of the conversation and add it to the global batch request object
    private static void addConversationRecordingsToBatch(String conversationId){
        try {
            List<RecordingMetadata> result = recordingApi.getConversationRecordingmetadata(conversationId);
            // Iterate through every result, check if there are one or more recordingIds in every conversation

            result.forEach((recording) -> {
                BatchDownloadRequest batchRequest = new BatchDownloadRequest()
                        .conversationId(recording.getConversationId())
                        .recordingId(recording.getId());
                batchRequestBody.getBatchDownloadRequestList().add(batchRequest);
                System.out.println("Added " + recording.getConversationId() +
                                    ": " + recording.getId() + " to batch request");
            });
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#getConversationRecordingmetadata");
            e.printStackTrace();
        }
    }


    // Plot conversationId and recordingId to request for batchdownload Recordings
    private static BatchDownloadJobStatusResult getRecordingStatus(BatchDownloadJobSubmissionResult recordingBatchRequest){
        System.out.println("Processing the recordings...");
        BatchDownloadJobStatusResult result = new BatchDownloadJobStatusResult();

        try {
            result = recordingApi.getRecordingBatchrequest(recordingBatchRequest.getId());

            if(result.getExpectedResultCount() != result.getResultCount()){
                System.out.println("Batch Result Status: " + result.getResultCount() + " / " + result.getExpectedResultCount());

                // Simple polling through recursion
                Thread.sleep(5000);
                return getRecordingStatus(recordingBatchRequest);
            }
        } catch (Exception e) {
            System.err.println("Exception when calling RecordingApi#getRecordingBatchrequest");
            e.printStackTrace();
        }

        // Once result count reach expected.
        return result;
    }

    // Get extension of a recording
    private static String getExtension(BatchDownloadJobResult jobResult) {
        // Store the content type to a variable that will be used later to determine the extension of recordings.
        String contentType = jobResult.getContentType();

        // Slice the text and gets the extension that will be used for the recording
        String ext = contentType.substring(contentType.lastIndexOf("/") + 1);
        // For the JSON special case
        if(ext.length() >= 4){
            ext = ext.substring(0, 4);
        }

        return ext;
    }

    // Download Recordings
    private static void downloadRecording(BatchDownloadJobResult recording) {
        System.out.println("Downloading now. Please wait...");

        String ext = getExtension(recording);
        String conversationId = recording.getConversationId();
        String recordingId = recording.getRecordingId();
        String sourceURL = recording.getResultUrl();

        String targetDirectory = ".";

        try {
            URL url = new URL(sourceURL);
            String fileName = conversationId + "_" + recordingId;
            Path targetPath = new File(targetDirectory + File.separator + fileName + "." + ext).toPath();
            Files.copy(url.openStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            System.err.println("Exception when downloading the recording to a file.");
            e.printStackTrace();
        }

    }

    public static void main(String[] args){
        authenticate();
        downloadAllRecordings(dates);
    }
}
