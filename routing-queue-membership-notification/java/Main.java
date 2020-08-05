import com.mypurecloud.sdk.v2.*;
import com.mypurecloud.sdk.v2.api.RoutingApi;
import com.mypurecloud.sdk.v2.api.request.GetRoutingQueueUsersRequest;
import com.mypurecloud.sdk.v2.api.request.GetRoutingQueuesRequest;
import com.mypurecloud.sdk.v2.extensions.AuthResponse;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationEvent;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationHandler;
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationListener;

import com.mypurecloud.sdk.v2.model.*;
import com.neovisionaries.ws.client.WebSocketException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;


public class Main {
    // Map to hold a list of member IDs for each queue in the org
    private static HashMap<Queue, ArrayList<String>> queueMap = new HashMap<>();

    public static void main(String[] args) {
        try {
            String clientId = System.getenv("GENESYS_CLOUD_CLIENT_ID");
            String clientSecret = System.getenv("GENESYS_CLOUD_CLIENT_SECRET");

            // Set Region
            PureCloudRegionHosts region = PureCloudRegionHosts.us_east_1;
            ApiClient apiClient = ApiClient.Builder.standard()
                    .withBasePath(region)
                    .build();

            ApiResponse<AuthResponse> authResponse = apiClient.authorizeClientCredentials(clientId, clientSecret);

            // Use the ApiClient instance
            Configuration.setDefaultApiClient(apiClient);

            // Get all routing queues for the org
            GetRoutingQueuesRequest getRoutingQueuesRequest = GetRoutingQueuesRequest.builder()
                    .build();
            RoutingApi routingApi = new RoutingApi();
            QueueEntityListing queueEntityListing = routingApi.getRoutingQueues(getRoutingQueuesRequest);

            // List of membership event listeners for the queues
            ArrayList<NotificationListener<?>> queueMembershipEventListeners = new ArrayList<>();

            // Iterate over every queue in the org
            queueEntityListing.getEntities().forEach((queue) -> {
                System.out.println("Queue name: " + queue.getName());
                // Get all members of the queue
                GetRoutingQueueUsersRequest getRoutingQueueUsersRequest = GetRoutingQueueUsersRequest.builder()
                        .withQueueId(queue.getId())
                        .build();
                ArrayList<String> members = new ArrayList<>();
                try {
                    QueueMemberEntityListing routingQueueUsers = routingApi.getRoutingQueueUsers(getRoutingQueueUsersRequest);
                    routingQueueUsers.getEntities().forEach((queueMember) -> {
                        // Print the member name and add their ID to the list
                        System.out.println("\tMember name: " + queueMember.getName());
                        members.add(queueMember.getId());
                    });
                } catch (ApiException | IOException e) {
                    e.printStackTrace();
                }
                // Map the queue to the list of member IDs
                queueMap.put(queue, members);
                // Add a listener to queue membership events
                queueMembershipEventListeners.add(new QueueMemberEventListener(queue));
                System.out.println();
            });

            // Build the notification handler for queue membership events
            NotificationHandler notificationHandler = NotificationHandler.Builder.standard()
                    // Listen for events for all queues in the org
                    .withNotificationListeners(queueMembershipEventListeners)
                    .withAutoConnect(false)
                    .build();
        } catch (WebSocketException | IOException e) {
            e.printStackTrace();
        }
        catch (ApiException e) {
            System.out.println(e.getRawBody());
            e.printStackTrace();
        }
    }

    public static class QueueMemberEventListener implements NotificationListener<QueueUserEventTopicQueueMember> {
        private String topic;
        private Queue queue;

        public String getTopic() {
            return topic;
        }

        public Class<QueueUserEventTopicQueueMember> getEventBodyClass() {
            return QueueUserEventTopicQueueMember.class;
        }

        // This is the callback for queue membership events. Called when a member joins or leaves the queue
        @Override
        public void onEvent(NotificationEvent<?> event) {
            // Extract the QueueUserEventTopicQueueMember object from the eventBody
            QueueUserEventTopicQueueMember member = (QueueUserEventTopicQueueMember)event.getEventBody();
            // Get the necessary details
            String id = member.getId();
            boolean joined = member.getJoined();

            // Add / Remove members from the queue
            if (joined)
                queueMap.get(queue).add(id);
            else
                queueMap.get(queue).remove(id);

            System.out.println("Event in Queue: " + queue.getName() +
                    "\n\tEvent type: member " + (joined ? "joined" : "left") +
                    "\n\tMember id: " + id);
            
            System.out.println("Current list of member IDs in Queue: " + queue.getName());
            queueMap.get(queue).forEach((queueMember) -> System.out.println("\t" + queueMember));
            System.out.println();
        }

        public QueueMemberEventListener(Queue queue) {
            // Subscribing to the "v2.routing.queues.{queueID}.users" topic
            this.topic = "v2.routing.queues." + queue.getId() + ".users";
            this.queue = queue;
        }
    }
}
