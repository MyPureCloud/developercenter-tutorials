package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func main() {
	environment := os.Getenv("PURECLOUD_ENVIRONMENT") // expected format: mypurecloud.com
	clientID := os.Getenv("PURECLOUD_CLIENT_ID")
	clientSecret := os.Getenv("PURECLOUD_CLIENT_SECRET")
	authURL, _ := url.Parse(fmt.Sprintf("https://login.%v/oauth/token", environment))
	timeout, _ := time.ParseDuration("16s")
	client := http.Client{Timeout: timeout}

	// Create auth request
	request := http.Request{
		URL:    authURL,
		Close:  true,
		Method: "POST",
		Header: make(map[string][]string),
	}
	request.Header.Set("Authorization", fmt.Sprintf("Basic %v", base64.StdEncoding.EncodeToString([]byte(clientID+":"+clientSecret))))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	formParams := url.Values{}
	formParams["grant_type"] = []string{"client_credentials"}
	request.Body = ioutil.NopCloser(strings.NewReader(formParams.Encode()))

	// Execute request
	fmt.Printf("Authorizing using %v\n", authURL)
	res, err := client.Do(&request)
	if err != nil {
		panic(err)
	}

	// Read body
	body, _ := ioutil.ReadAll(res.Body)

	// Abort if error
	if res.StatusCode != 200 {
		msg := fmt.Sprintf("Auth response is error: %v", res.Status)
		fmt.Println(msg)
		fmt.Println(string(body))
		panic(errors.New(msg))
	}

	// Parse response body to get access token
	var response *AuthResponse
	json.Unmarshal(body, &response)
	fmt.Printf("Token expires in %v seconds\n", response.ExpiresIn)
	accessToken := response.AccessToken

	// Build users request
	usersURL, _ := url.Parse(fmt.Sprintf("https://api.%v/api/v2/users?pageSize=10", environment))
	request = http.Request{
		URL:    usersURL,
		Close:  true,
		Method: "GET",
		Header: make(map[string][]string),
	}
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %v", accessToken))

	// Execute request
	fmt.Printf("Getting users from %v\n", usersURL)
	res, err = client.Do(&request)
	if err != nil {
		panic(err)
	}

	// Read body
	body, _ = ioutil.ReadAll(res.Body)

	// Abort if error
	if res.StatusCode != 200 {
		msg := fmt.Sprintf("Auth response is error: %v", res.Status)
		fmt.Println(msg)
		fmt.Println(string(body))
		panic(errors.New(msg))
	}

	// Parse response body
	var users *Userentitylisting
	json.Unmarshal(body, &users)
	fmt.Printf("Retrieved %v users:\n", len(*users.Entities))
	for _, user := range *users.Entities {
		fmt.Printf("  %v\n", *user.Name)
	}
}

// AuthResponse is the response from the auth server
type AuthResponse struct {
	AccessToken string `json:"access_token,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	ExpiresIn   int    `json:"expires_in,omitempty"`
}

// Userentitylisting represents the get users response
type Userentitylisting struct {
	Entities    *[]User `json:"entities,omitempty"`
	PageSize    *int32  `json:"pageSize,omitempty"`
	PageNumber  *int32  `json:"pageNumber,omitempty"`
	Total       *int64  `json:"total,omitempty"`
	FirstURI    *string `json:"firstUri,omitempty"`
	SelfURI     *string `json:"selfUri,omitempty"`
	NextURI     *string `json:"nextUri,omitempty"`
	LastURI     *string `json:"lastUri,omitempty"`
	PreviousURI *string `json:"previousUri,omitempty"`
	PageCount   *int32  `json:"pageCount,omitempty"`
}

// String returns a JSON representation of the model
func (o *Userentitylisting) String() string {
	j, _ := json.Marshal(o)
	return string(j)
}

// User represents a Genesys Cloud user
//
// NOTE: this is a partial model. Some properties have been removed for brevity in this example.
// See the SDK for full model structs.
type User struct {
	ID                 *string   `json:"id,omitempty"`
	Name               *string   `json:"name,omitempty"`
	Department         *string   `json:"department,omitempty"`
	Email              *string   `json:"email,omitempty"`
	State              *string   `json:"state,omitempty"`
	Title              *string   `json:"title,omitempty"`
	Username           *string   `json:"username,omitempty"`
	Version            *int32    `json:"version,omitempty"`
	Certifications     *[]string `json:"certifications,omitempty"`
	ProfileSkills      *[]string `json:"profileSkills,omitempty"`
	AcdAutoAnswer      *bool     `json:"acdAutoAnswer,omitempty"`
	LanguagePreference *string   `json:"languagePreference,omitempty"`
	SelfURI            *string   `json:"selfUri,omitempty"`
}

// String returns a JSON representation of the model
func (o *User) String() string {
	j, _ := json.Marshal(o)
	return string(j)
}
