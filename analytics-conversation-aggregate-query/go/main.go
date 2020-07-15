package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/mypurecloud/platform-client-sdk-go/platformclientv2"
)

func main() {
	environment := os.Getenv("GENESYS_CLOUD_ENVIRONMENT") // expected format: mypurecloud.com
	clientID := os.Getenv("GENESYS_CLOUD_CLIENT_ID")
	clientSecret := os.Getenv("GENESYS_CLOUD_CLIENT_SECRET")

	// Configure SDK
	config := platformclientv2.GetDefaultConfiguration()
	config.BasePath = fmt.Sprintf("https://api.%v", environment)

	// Authorize SDK
	fmt.Println("Authorizing...")
	err := config.AuthorizeClientCredentials(clientID, clientSecret)
	if err != nil {
		panic(err)
	}

	analyticsAPI := platformclientv2.NewAnalyticsApi()
	routingAPI := platformclientv2.NewRoutingApi()

	// Get Support queue
	fmt.Println("Getting queues...")
	queues, _, err := routingAPI.GetRoutingQueues(1, 1, "", "Support", nil, nil)
	if err != nil {
		panic(err)
	}
	if len(*queues.Entities) != 1 {
		panic("Failed to find queue!")
	}

	// Determeine interval for last 7 days
	now := time.Now()
	interval := fmt.Sprintf("%v/%v", now.AddDate(0, 0, -7).Format(time.RFC3339), now.Format(time.RFC3339))

	// Build query
	query := platformclientv2.Conversationaggregationquery{
		Interval: &interval,
		GroupBy:  &([]string{"queueId"}),
		Metrics:  &([]string{"nOffered", "tAnswered", "tTalk"}),
		Filter: &platformclientv2.Conversationaggregatequeryfilter{
			VarType: platformclientv2.String("and"),
			Clauses: &[]platformclientv2.Conversationaggregatequeryclause{
				platformclientv2.Conversationaggregatequeryclause{
					VarType: platformclientv2.String("or"),
					Predicates: &[]platformclientv2.Conversationaggregatequerypredicate{
						platformclientv2.Conversationaggregatequerypredicate{
							Dimension: platformclientv2.String("queueId"),
							Value:     (*queues.Entities)[0].Id,
						},
					},
				},
			},
		},
	}

	// Execute query
	fmt.Println("Executing analytics query...")
	results, _, err := analyticsAPI.PostAnalyticsConversationsAggregatesQuery(query)
	if err != nil {
		panic(err)
	}

	// Print results
	j, _ := json.MarshalIndent(results, "", "  ")
	fmt.Printf("Query results:\n%v\n", string(j))
}
