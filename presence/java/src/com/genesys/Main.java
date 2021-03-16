package com.genesys;

import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.api.PresenceApi;
import com.mypurecloud.sdk.v2.api.UsersApi;
import com.mypurecloud.sdk.v2.api.request.GetPresencedefinitionsRequest;
import com.mypurecloud.sdk.v2.model.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Arrays;

public class Main {

    public static void main(String[] args) {
        try {
            // Configure SDK settings
            String accessToken = "";
            Configuration.setDefaultApiClient(ApiClient.Builder.standard()
                    .withAccessToken(accessToken)
                    .withBasePath("https://api.mypurecloud.com")
                    .build());

            // Instantiate APIs
            UsersApi usersApi = new UsersApi();
            PresenceApi presenceApi = new PresenceApi();

            // Validate token with GET /api/v2/users/me (throws an exception if unauthorized)
            UserMe me = usersApi.getUsersMe(Arrays.asList("presence"), null);
            System.out.println("Hello " + me.getName());

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
            UserPresence presenceResponse = presenceApi.patchUserPresence(me.getId(), "PURECLOUD", body);

            // Wait for user input
            System.out.print("Press enter to set status to break");
            br.readLine();

            // Set presence to Available
            body = new UserPresence();
            body.setPresenceDefinition(breakPresence);
            presenceResponse = presenceApi.patchUserPresence(me.getId(), "PURECLOUD", body);

            System.out.print("Application complete");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
