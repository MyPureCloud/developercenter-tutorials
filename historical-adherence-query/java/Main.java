import com.google.common.base.Stopwatch;
import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.ApiException;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.api.UsersApi;
import com.mypurecloud.sdk.v2.api.WorkforceManagementApi;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationHandler;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationListener;
import com.mypurecloud.sdk.v2.model.User;
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

        // Set client credentials
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
        UserMe me = usersApi.getUsersMe(Collections.emptyList());
        String myId = me.getId()

        // Create an instance of the notification handler
        NotificationHandler notificationHandler = new NotificationHandler();

        // Create an instance of your historical adherence event listener
        HistoricalAdherenceEventListener historicalAdherenceEventListener = new HistoricalAdherenceEventListener(myId);

        // Subscribe to the listener
        notificationHandler.addSubscription(historicalAdherenceEventListener);

        // Connect to the web socket
        notificationHandler.connect(true);

        // Making an API call too soon after subscribing can result in the system thinking there are no subscribers.
        TimeUnit.SECONDS.sleep(5);

        // Workforce Management Api Instance for the request
        WorkforceManagementApi wfmApiInstance = new WorkforceManagementApi();

        // Get the ID of your division
        String divisionId = me.getDivision().getId();

        // Get a list of management units
        List<ManagementUnit> managementUnits = wfmApiInstance.getWorkforcemanagementManagementunits(1, 1,"", "", divisionId).getEntities();
        
        // Get the ID of the management unit
        String managementUnitId = managementUnits.get(0).getId();

        // List of all users in the management unit
        List<User> users = wfmApiInstance.getWorkforcemanagementManagementunitUsers(managementUnitId).getEntities();

        // List of the users to query
        List<String> userIds = new ArrayList<String>();
        userIds.add(users.get(0).getId());
        userIds.add(users.get(1).getId());
        userIds.add(users.get(2).getId());

        // Calendar for setting the start and end date of the query
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.YEAR, 2020);
        calendar.set(Calendar.MONTH, Calendar.JULY);
        calendar.set(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR, 5);

        Date startDate = calendar.getTime(); //Start date for the Historical Adherence query (2020-07-01T05:00:00.000Z)

        // End date, here we are querying one day
        calendar.set(Calendar.DAY_OF_MONTH, 2);
        Date endDate = calendar.getTime(); //End date for the Historical Adherence query (2020-07-02T05:00:00.000Z)
        String timeZone = "America/Chicago";

        // Construct the body of the request using the variables set above
        WfmHistoricalAdherenceQuery body = new WfmHistoricalAdherenceQuery(); // WfmHistoricalAdherenceQuery | body
        body.setStartDate(startDate);
        body.setEndDate(endDate);
        body.setTimeZone(timeZone);
        body.setUserIds(userIds);

        try
        {
            // Send the request
            WfmHistoricalAdherenceResponse pendingResult = wfmApiInstance.postWorkforcemanagementManagementunitHistoricaladherencequery(managementUnitId, body);
            System.out.println(pendingResult);

            // Save the operation ID
            String operationId = pendingResult.getId();

            // Wait for the query to complete
            waitUntil(() -> historicalAdherenceEventListener.isCompleted(operationId), 15, 1000);

            // Call the listener with the operation ID of the, now completed, request.
            WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice completedResult = historicalAdherenceEventListener.getResultForId(operationId);
            System.out.println(completedResult.toString());

            // Retrieve the downloadUrls array from the result.
            List<String> downloadUrls = completedResult.getDownloadUrls();

            // Disconnect from the websocket.
            notificationHandler.disconnect();

            // This catches any possible api related exceptions from the initial request.
        } catch(ApiException e)
        {
            System.err.println("Exception when calling WorkforceManagementApi#postWorkforcemanagementManagementunitHistoricaladherencequery");
            System.err.println(e.getRawBody());

            // This catches a possible no such element exception from the query not returning as completed
        } catch (NoSuchElementException e)
        {
            System.out.println(e.getMessage());
        }

    }

    // This is a simple example of a helper method to check if the request is completed
    private static void waitUntil(Supplier<Boolean> isDone, int maxTimeSeconds, long sleepTimeMs) throws InterruptedException,
        TimeoutException {
        // Creates a stopwatch to keep track of time
        Stopwatch sw = Stopwatch.createStarted();
        while (!isDone.get()) {
            // Pauses the process for a specified number of milliseconds between checks
            Thread.sleep(sleepTimeMs);

            // Thows an exception if over the set maximum time
            if (sw.elapsed(TimeUnit.SECONDS) > maxTimeSeconds) {
                throw new TimeoutException(String.format("Timed out waiting after %s seconds", maxTimeSeconds));
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
            // The topic to which the notification handler subscribes
            this.topic = String.format("v2.users.%s.workforcemanagement.historicaladherencequery", userId);
        }

        // Allows you to retrieve the result after it has been completed
        public WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice getResultForId(String operationId) {
            return resultMap.get(operationId);
        }

        // Used to check if the request has been completed for a given operation ID
        public Boolean isCompleted(String operationId){
            if (resultMap.containsKey(operationId)) {
                WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice result = resultMap.get(operationId);
                if (result.getQueryState() == WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice.QueryStateEnum.COMPLETE) {
                    //the request has been completed
                    return true;
                }
                // If the result is not "complete", you can determine how to handle that, here we throw an exception.
                throw new NoSuchElementException(String.format("The resulting state for %s was %s", operationId, result.getQueryState()));
            }
            // The request has not yet been completed
            return false;
        }

        // This is the callback for historical adherence events, called when a query has finished.
        @Override
        public void onEvent(NotificationEvent<?> event) {
            // Extract the WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice object from the eventBody
            WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice result = (WfmHistoricalAdherenceCalculationsCompleteTopicWfmHistoricalAdherenceCalculationsCompleteNotice) event.getEventBody();

            // Store the result mapped by the operation ID.
            resultMap.put(result.getId(), result);
        }
    }
}