import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.api.PresenceApi;
import com.mypurecloud.sdk.v2.api.UsersApi;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.api.request.GetPresencedefinitionsRequest;
import com.mypurecloud.sdk.v2.model.User;
import com.mypurecloud.sdk.v2.model.OrganizationPresenceEntityListing;
import com.mypurecloud.sdk.v2.model.PresenceDefinition;
import com.mypurecloud.sdk.v2.model.OrganizationPresence;
import com.mypurecloud.sdk.v2.model.UserPresence;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Arrays;

public class Presence {

    public static void main(String[] args) {
        try {
            // Define your OAuth client credentials
            final String clientId = System.getenv("GENESYS_CLOUD_CLIENT_ID");
            final String clientSecret = System.getenv("GENESYS_CLOUD_CLIENT_SECRET");
            // orgRegion value example: us_east_1
            final String orgRegion = System.getenv("GENESYS_CLOUD_REGION");

            // User ID to use
            final String userId = " --- USER ID HERE ---";

            // Set Region
            PureCloudRegionHosts region = PureCloudRegionHosts.valueOf(orgRegion);

            ApiClient apiClient = ApiClient.Builder.standard().withBasePath(region).build();
            apiClient.authorizeClientCredentials(clientId, clientSecret);

            Configuration.setDefaultApiClient(apiClient);

            // Instantiate APIs
            UsersApi usersApi = new UsersApi();
            PresenceApi presenceApi = new PresenceApi();

            // Validate token with GET /api/v2/user (throws an exception if unauthorized)
            // (userId, Arrays.asList("presence"), null);
            User user = usersApi.getUser(userId, Arrays.asList("presence"), null, "active");
            System.out.println("Hello " + user.getName());

            // Get presences
            GetPresencedefinitionsRequest presencedefinitionsRequest = GetPresencedefinitionsRequest.builder()
                    .withPageNumber(1)
                    .withPageSize(25)
                    .build();
            OrganizationPresenceEntityListing presences = presenceApi.getPresencedefinitions(presencedefinitionsRequest);

            // Find Available and Break org presences
            PresenceDefinition availablePresence = null;
            PresenceDefinition breakPresence = null;
            for (int i = 0; i < presences.getEntities().size(); i++) {
                OrganizationPresence presence = presences.getEntities().get(i);

                // Ignore non-primary (i.e. user-defined presences) for this tutorial
                if (!presence.getPrimary()) continue;

                // Check system presences
                if (presence.getSystemPresence().equalsIgnoreCase("available")) {
                    availablePresence = new PresenceDefinition();
                    availablePresence.setId(presence.getId());
                } else if (presence.getSystemPresence().equalsIgnoreCase("break")) {
                    breakPresence = new PresenceDefinition();
                    breakPresence.setId(presence.getId());
                }
            }

            // Verify results
            if (availablePresence == null || breakPresence == null) {
                throw new Exception("Failed to find presences!");
            }

            //Notifications not implemented in the Java tutorial

            // Wait for user input
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            System.out.print("Press enter to set status to available");
            br.readLine();

            // Set presence to Available
            UserPresence body = new UserPresence();
            body.setPresenceDefinition(availablePresence);
            UserPresence presenceResponse = presenceApi.patchUserPresence(user.getId(), "PURECLOUD", body);

            // Wait for user input
            System.out.print("Press enter to set status to break");
            br.readLine();

            // Set presence to Available
            body = new UserPresence();
            body.setPresenceDefinition(breakPresence);
            presenceResponse = presenceApi.patchUserPresence(user.getId(), "PURECLOUD", body);

            System.out.print("Application complete");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
