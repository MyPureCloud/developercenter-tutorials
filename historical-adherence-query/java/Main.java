import com.google.common.base.Stopwatch;
import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.ApiException;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.api.UsersApi;
import com.mypurecloud.sdk.v2.api.WorkforceManagementApi;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationHandler;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationListener;
import com.mypurecloud.sdk.v2.model.UserMe;
import com.mypurecloud.sdk.v2.model.WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice;
import com.mypurecloud.sdk.v2.model.WfmHistoricalAdherenceQuery;
import com.mypurecloud.sdk.v2.model.WfmHistoricalAdherenceResponse;
import com.neovisionaries.ws.client.WebSocketException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

public class Main {

    public static void main(String[] args) throws IOException, ApiException, InterruptedException, WebSocketException,
        TimeoutException {

        // For more information on how to authenticate your api client, here is a useful resource.
        // https://developer.mypurecloud.com/api/rest/client-libraries/java/index.html#authenticating
        String clientId = System.getenv("PURECLOUD_CLIENT_ID");
        String clientSecret = System.getenv("PURECLOUD_CLIENT_SECRET");

        // Set Region
        PureCloudRegionHosts region = PureCloudRegionHosts.us_east_1;
        ApiClient apiClient = ApiClient.Builder.standard()
            .withBasePath(region)
            .build();

        ApiResponse<AuthResponse> authResponse = apiClient.authorizeClientCredentials(clientId, clientSecret);

        // Set the ApiClient instance as your default api client
        Configuration.setDefaultApiClient(apiClient);

        // Create an instance of UsersApi to retrieve your own userId
        UsersApi usersApi = new UsersApi();
        UserMe me = usersApi.getUsersMe(Collections.singletonList("presence"));
        String myId = me.getId()

        // Create an instance of the notification handler for your listeners
        NotificationHandler notificationHandler = new NotificationHandler();
        // Create a variable for your historical adherence event listener and instantiate it.
        HistoricalAdherenceEventListener historicalAdherenceEventListener = new HistoricalAdherenceEventListener(myId);
        // Subscribe to the listener
        notificationHandler.addSubscription(historicalAdherenceEventListener);
        // Connect to the web socket
        notificationHandler.connect(true);

        // Making an API call too soon after subscribing can result in the system thinking there are no subscribers.
        TimeUnit.SECONDS.sleep(5);

        String muId = "33333333-3333-3333-3333-333333333333"; // String | The management unit ID of the management unit

        // Create a list of the users you want to query
        List<String> userIds = new ArrayList<String>();
        userIds.add("00000000-0000-0000-0000-000000000000");
        userIds.add("11111111-1111-1111-1111-111111111111");
        userIds.add("22222222-2222-2222-2222-222222222222");

        // Create a calendar for setting the start and end date of the query
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.YEAR, 2020);
        calendar.set(Calendar.MONTH, Calendar.JULY);
        calendar.set(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR, 5);

        Date startDate = calendar.getTime(); //Start date for the Historical Adherence query (2020-07-01T05:00:00.000Z)

        // Now set the end date, here we are querying one day
        calendar.set(Calendar.DAY_OF_MONTH, 2);
        Date endDate = calendar.getTime(); //End date for the Historical Adherence query (2020-07-02T05:00:00.000Z)
        String timeZone = "America/Chicago";

        // Construct the body of the request using the variables set above
        WfmHistoricalAdherenceQuery body = new WfmHistoricalAdherenceQuery(); // WfmHistoricalAdherenceQuery | body
        body.setStartDate(startDate);
        body.setEndDate(endDate);
        body.setTimeZone(timeZone);
        body.setUserIds(userIds);

        // Create a Workforce Management Api Instance for the request
        WorkforceManagementApi wfmApiInstance = new WorkforceManagementApi();
        try
        {
            // Send the request using your workforce management api instance,
            // passing your management unit ID and the body you just created
            WfmHistoricalAdherenceResponse pendingResult = wfmApiInstance.postWorkforcemanagementManagementunitHistoricaladherencequery(muId, body);
            System.out.println(pendingResult);
            // In the response from this request, you will get an id back.
            // Think of this as an operation ID.
            // In your eventListener,
            // watch for a notification with an id that matches the one you got back from your request
            // to make sure this is your request, and not another request in the same Management Unit.
            String operationId = pendingResult.getId();

            // Wait until the query with your operation ID is completed.
            // Here we are waiting a maximum of 15 seconds with one second in between each check.
            // Larger queries will take longer,
            // hundreds of users for multiple weeks of time could take over a minute to respond.
            waitUntil(() -> historicalAdherenceEventListener.isCompleted(operationId), 15, 1000);

            // Call the listener with the operation ID of the now completed request to return the related result.
            WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice completedResult = historicalAdherenceEventListener.getResultForId(operationId);
            // Finally your notification handler code will get a downloadUrls array.
            // This where you can download the historical adherence data for the agents you requested.
            List<String> downloadUrls = completedResult.getDownloadUrls();
            System.out.println(completedResult.toString());
            // Once we are done with out requests we can disconnect from the websocket.
            notificationHandler.disconnect();

            // This catches any possible api related exceptions from the initial request.
        } catch(ApiException e)
        {
            System.err.println("Exception when calling WorkforceManagementApi#postWorkforcemanagementManagementunitHistoricaladherencequery");
            System.err.println(e.getRawBody());
            e.printStackTrace();//https://bitbucket.org/inindca/public-api-v2/pull-requests/5473/wfm-4599-use-apimockserver-for-remaining/activity
            // This Catches a possible no such element exception from the query not returning as completed
        } catch (NoSuchElementException e)
        {
            System.out.println(e.getMessage());
        }

    }

    // This is a simple example of a helper method to check if the request is completed
    private static void waitUntil(Supplier<Boolean> isDone, int maxTimeSeconds, long sleepTimeMs) throws InterruptedException,
        TimeoutException {
        // We are using a stopwatch to keep track of time here
        Stopwatch sw = Stopwatch.createStarted();
        while (!isDone.get()) {
            // This pauses the process for a specified number of milliseconds between checks
            Thread.sleep(sleepTimeMs);
            // If the request still is not done by the time we hit our max time,
            // we throw an exception saying it has timed out to avoid being stuck
            // waiting on a response indefinitely
            if (sw.elapsed(TimeUnit.SECONDS) > maxTimeSeconds) {
                throw new TimeoutException("Timed out waiting after " + maxTimeSeconds + " seconds");
            }
        }
    }

    public class HistoricalAdherenceEventListener implements
        NotificationListener<WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice> {
        private String topic;
        private HashMap<String, WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice> resultMap = new HashMap<>();

        public Class<WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice> getEventBodyClass() {
            return WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice.class;
        }

        public String getTopic() {
            return topic;
        }

        public HistoricalAdherenceEventListener(String userId) {
            // This is the topic to which the notification handler subscribes
            this.topic = "v2.users." + userId + ".workforcemanagement.historicaladherencequery";
        }

        // This allows you to retrieve the result after it has been completed
        public WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice getResultForId(String operationId) {
            return resultMap.get(operationId);
        }

        // This is used to check if the request has been completed for a given operations ID
        public Boolean isCompleted(String operationId){
            if (resultMap.containsKey(operationId)) {
                WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice result = resultMap.get(operationId);
                if (result.getQueryState() == WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice.QueryStateEnum.COMPLETE) {
                    //the request has been completed
                    return true;
                }
                // If the result is not completed, you can determine how to handle that, here we will just throw an exception with the unexpected state
                throw new NoSuchElementException("The resulting state for " + operationId + " was " + result.getQueryState());
            }
            // The request has not yet been completed
            return false;
        }

        // This is the callback for historical adherence events, called when a query is made.
        @Override
        public void onEvent(NotificationEvent<?> event) {
            // Extract the WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice object from the eventBody
            WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice result = (WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice) event.getEventBody();
            resultMap.put(result.getId(), result);
            // Get the necessary details
        }
    }
}