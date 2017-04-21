package main
import (

    "os"
    "strings"
    "log"
    "net/http"

)

var (
    authUrl, _ = url.Parse("https://login.inindca.com")
    apiUrl, _  = url.Parse("https://api.inindca.com")
)
type TokenResponse struct {
    AccessToken string `json:"access_token"`
    TokenType   string `json:"token_type"`
    ExpiresIn   int64  `json:"expires_in"`
}

func main() {
    clientId = os.Getenv("PURECLOUD_CLIENT_ID")
    secret   = os.Getenv("PURECLOUD_SECRET")

    body := bytes.NewBufferString(
        url.Values(map[string][]string{
            "grant_type":   []string{"client_credentials"}
        }).Encode())


    request := &http.Request{
        URL:    target,
        Method: "POST",
        Header: map[string][]string{
            "Accept":       []string{"application/json"},
            "Content-Type": []string{"application/x-www-form-urlencoded"},
            "grant_type" : "client_credentials"
        },
        Body:          ioutil.NopCloser(body),
        ContentLength: int64(body.Len()),
    }
    //the token endpoint uses basic auth with client credentials
    request.SetBasicAuth(clientId, secret)
    response, err := http.DefaultClient.Do(request)
    if err != nil {
        log.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }



}

/*
func auth(w http.ResponseWriter, r *http.Request) {
    //form the query with the oauth paramters of our client application
    query := url.Values(map[string][]string{
        "response_type": []string{"code"},
        "client_id":     []string{clientId},
        "redirect_uri":  []string{redirect},
    })
    target, _ := authUrl.Parse(authPath)
    target.RawQuery = url.Values(query).Encode()
    //redirect the user to the auth server
    log.Printf("redirecting user agent to %v", target)
    http.Redirect(w, r, target.String(), http.StatusFound)
}
//callback is the handler that will be called by the authorization server upon
//successful authorization. The code will be encoded as the query param "code"
func callback(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    target, _ := authUrl.Parse(tokenPath)
    //form the oauth token request
    body := bytes.NewBufferString(
        url.Values(map[string][]string{
            "grant_type":   []string{"authorization_code"},
            "code":         []string{code},
            "redirect_uri": []string{redirect},
        }).Encode())
    request := &http.Request{
        URL:    target,
        Method: "POST",
        Header: map[string][]string{
            "Accept":       []string{"application/json"},
            "Content-Type": []string{"application/x-www-form-urlencoded"},
        },
        Body:          ioutil.NopCloser(body),
        ContentLength: int64(body.Len()),
    }
    //the token endpoint uses basic auth with client credentials
    request.SetBasicAuth(clientId, secret)
    response, err := http.DefaultClient.Do(request)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer response.Body.Close()
    if status := response.StatusCode; status != http.StatusOK {
        msg := fmt.Sprintf("bad status for token request: %d", status)
        http.Error(w, msg, http.StatusInternalServerError)
        return
    }
    //parse the access token from the response
    tokenResponse := &TokenResponse{}
    dec := json.NewDecoder(response.Body)
    dec.Decode(tokenResponse)


    //We have the access token now, everything from here is just for fun and demonstration
    //get the user from the public api
    user, _ := getUser(tokenResponse.AccessToken)
    templ.Execute(w, struct {
        User *User
    }{user})
}
type User struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    PhoneNumber string `json:"phoneNumber"`
    Title       string `json:"title"`
    Department  string `json:"department"`
    Images      []struct {
        ImageURI string `json:"imageUri"`
    } `json:"userImages"`
}
func (u *User) DisplayName() string {
    if parts := strings.Split(u.Name, ","); len(parts) == 2 {
        first, last := strings.TrimSpace(parts[1]), strings.TrimSpace(parts[0])
        return fmt.Sprintf("%s %s", first, last)
    }
    return u.Name
}
func (u *User) ImageURI() string {
    if len(u.Images) == 6 {
        return u.Images[3].ImageURI
    }
    return ""
}
func getUser(token string) (*User, error) {
    target, _ := apiUrl.Parse(mePath)
    request := &http.Request{
        URL:    target,
        Method: "GET",
        Header: map[string][]string{
            "Accept":        []string{"application/json"},
            "Authorization": []string{fmt.Sprintf("bearer %s", token)},
        },
    }
    resp, err := http.DefaultClient.Do(request)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return nil, errors.New("bad status " + resp.Status)
    }
    user := &User{}
    dec := json.NewDecoder(resp.Body)
    return user, dec.Decode(user)
}
var templ = template.Must(template.New("user").Parse(user_templ))
const user_templ = `
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap-theme.min.css">
    <title>Hello OAuth2</title>
  </head>
  <body>
    <div class="container" style="padding-top: 65px">
      <div class="panel panel-default">
        <div class="panel-heading">
          <h3 class="panel-title">Welcome {{.User.DisplayName}}</h3>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-9 col-md-push-3">
              {{.User.Department}}<br>
              {{.User.Title}}<br>
              {{.User.PhoneNumber}}<br>
            </div>
            <div class="col-md-3 col-md-pull-9">
              <img src="{{.User.ImageURI}}">
            </div>
          </div>
        </div>
      </div>

    </div>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>
  </body>
</html>*/
