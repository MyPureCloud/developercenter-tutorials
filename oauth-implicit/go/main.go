package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

func main() {
	openBrowser("http://localhost:5000/")

	http.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		http.ServeFile(writer, request, "index.html")
	})

	http.HandleFunc("/access_token/", func(writer http.ResponseWriter, request *http.Request) {
		URL := request.URL.String()
		if strings.Contains(URL, "access_token") {
			from := strings.LastIndex(URL, "/") + 1
			to := len(URL)
			token := URL[from:to]
			result, err := validateToken(token)
			if err != nil {
				log.Fatal(err)
			}
			fmt.Println(result)
		}
	})

	http.HandleFunc("/error/", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(writer, "<html><p> 404. Not found. </p></html>")
	})

	err := http.ListenAndServe(":5000", nil)
	if err != nil {
		log.Fatal(err)
	}
}

// validates the access token returned from the implicit grant login
func validateToken(token string) (string, error) {
	environment := os.Getenv("GENESYS_CLOUD_ENVIRONMENT")

	client := &http.Client{Timeout: time.Duration(5) * time.Second}

	// create a new request for GET api/v2/users/me
	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.%s/api/v2/users/me", environment), nil)
	if err != nil {
		return "", fmt.Errorf("got error %s", err.Error())
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	// make the request
	response, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("got error %s", err.Error())
	}

	defer response.Body.Close()

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}

	return string(body), nil
}

// opens the browser at the specified URL
func openBrowser(URL string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", URL).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", URL).Start()
	case "darwin":
		err = exec.Command("open", URL).Start()
	default:
		err = fmt.Errorf("unsupported system")
	}
	if err != nil {
		log.Fatal(err)
	}
}
