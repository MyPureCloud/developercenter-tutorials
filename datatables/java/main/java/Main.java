import com.mypurecloud.sdk.v2.ApiClient;
import com.mypurecloud.sdk.v2.ApiException;
import com.mypurecloud.sdk.v2.Configuration;
import com.mypurecloud.sdk.v2.PureCloudRegionHosts;
import com.mypurecloud.sdk.v2.api.ArchitectApi;
import com.mypurecloud.sdk.v2.model.DataTable;
import com.mypurecloud.sdk.v2.model.JsonSchemaDocument;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.*;

import java.util.*;
import java.io.*;

/**
 * The sample code requires at least Java 9 to run
 */
public class Main {
    // Data Table Schema
    private static DataTable datatableSchema = new DataTable()
        .name("My DataTable")
        .description("A new table that will contain data.")
        .schema(new JsonSchemaDocument()
            .schema("http://json-schema.org/draft-04/schema#")
            .type("object")
            .additionalProperties(false)
            .required(new ArrayList<>(List.of("key")))
            .properties(new HashMap<>(){{
                put("key", new HashMap<>(){{
                    put("title", "item_id");
                    put("type", "string");
                    put("$id", "/properties/key");
                }});
                put("available", new HashMap<>(){{
                    put("title", "available");
                    put("type", "boolean");
                    put("$id", "/properties/available");
                    put("default", false);
                }});
                put("expiration", new HashMap<>(){{
                    put("title", "expiration");
                    put("type", "integer");
                    put("$id", "/properties/expiration");
                }});
                put("price", new HashMap<>(){{
                    put("title", "price");
                    put("type", "number");
                    put("$id", "/properties/price");
                }});
                put("description", new HashMap<>(){{
                    put("title", "description");
                    put("type", "string");
                    put("$id", "/properties/description");
                }});
            }})
        );

    private static Map<String, String> dataTypeMapping = Map.ofEntries(
        Map.entry("key", "string"),
        Map.entry("available", "boolean"),
        Map.entry("expiration", "integer"),
        Map.entry("price", "number"),
        Map.entry("description", "string")
    );

    public static void main(String[] args) throws IOException, CsvValidationException {
        // Define your OAuth client credentials
        final String clientId = System.getenv("GENESYS_CLOUD_CLIENT_ID");
        final String clientSecret = System.getenv("GENESYS_CLOUD_CLIENT_SECRET");
        // orgRegion value example: us_east_1
        final String orgRegion = System.getenv("GENESYS_CLOUD_REGION");

        // Set Region
        PureCloudRegionHosts region = PureCloudRegionHosts.valueOf(orgRegion);

        // Authenticate
        ApiClient apiClient;
        
        try {
            apiClient = ApiClient.Builder.standard().withBasePath(region).build();
            apiClient.authorizeClientCredentials(clientId, clientSecret);

            // Use the ApiClient instance
            Configuration.setDefaultApiClient(apiClient);
        } catch (ApiException e) {
            System.err.println("Exception while authenticating.");
            e.printStackTrace();
        }

        // APIs
        ArchitectApi architectApi = new ArchitectApi();

        // Create the data table
        DataTable dataTable = new DataTable();
        try {
            dataTable = architectApi.postFlowsDatatables(datatableSchema);
        } catch (ApiException e) {
            System.err.println("Exception calling ArchitectApi#postFlowsDatatables.");
            e.printStackTrace();
        }
        System.out.println("Successfully created table.");

        // Read the data from the CSV
        var csvSource = "src/main/resources/sample.csv";
        try (var fr = new FileReader(csvSource);
        var reader = new CSVReader(fr)) {
            String[] nextLine;
            List<String> headers = new ArrayList<>();
            var lineCount = 0;
            while ((nextLine = reader.readNext()) != null) {
                if(lineCount == 0){
                    headers = Arrays.asList(nextLine);
                } else {
                    Map<String, Object> body = new HashMap<>();
                    for (int i = 0; i < nextLine.length; i++) {

                        // Determine data type
                        String value = nextLine[i];
                        var header = headers.get(i);
                        switch(dataTypeMapping.get(header)){
                            case "string":
                                body.put(header, value);
                                break;
                            case "boolean":
                                body.put(header, value == "true");
                                break;
                            case "integer":
                                body.put(header, Integer.parseInt(value));
                                break;
                            case "number":
                                body.put(header, Float.parseFloat(value));
                                break;
                        }
                    }

                    // Add data table rows
                    try {
                        architectApi.postFlowsDatatableRows(dataTable.getId(), body);
                    } catch (ApiException e) {
                        System.err.println("Exception calling ArchitectApi#postFlowsDatatableRows.");
                        e.printStackTrace();
                    }
                }
                lineCount++;
            }
        }
        System.out.println("Succesfully added rows.");
    }
}
