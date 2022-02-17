using authorization_code_aspdotnet.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using Newtonsoft.Json.Linq;

namespace authorization_code_aspdotnet.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        // Update the values below for your Genesys Cloud Environment Credentials
        // and the redirectUri to be used.

        // Authorization Code credentials
        private string clientId = Environment.GetEnvironmentVariable("GENESYS_CLOUD_CLIENT_ID");
        private string clientSecret = Environment.GetEnvironmentVariable("GENESYS_CLOUD_CLIENT_SECRET");
        // expected format for environment: mypurecloud.com
        private string environment = Environment.GetEnvironmentVariable("GENESYS_CLOUD_ENVIRONMENT");

        private string redirectUri = "http://localhost:5000/";

        public HomeController(ILogger<HomeController> logger) {
            _logger = logger;
        }

        public async Task<IActionResult> Index() {
            ViewData["Title"] = "Home page";

            var authToken = GetAuthTokenFromSession();

            if (Request.Query.ContainsKey("code")) {
                try {
                    var code = Request.Query["code"];
                    authToken = await GetTokenFromCode(code);
                    ViewData["AccessToken"] = authToken;

                    var user = GetUserInfo(authToken);
                    ViewData["Username"] = user.Result["name"].ToString();
                } catch (Exception ex) {
                    Console.WriteLine(ex);
                    Console.WriteLine(ex.StackTrace);
                }
            }

            if (string.IsNullOrEmpty(authToken)) {
                return Redirect($"https://login.{environment}/oauth/authorize?client_id=" + clientId +
                                "&response_type=code&redirect_uri=" +
                                UrlEncoder.Default.Encode(redirectUri));
            }

            return View();
        }

        private async Task<string> GetTokenFromCode(string code) {
            var client = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri)
            });
            var basicAuth = Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes(clientId + ":" + clientSecret));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            var response = await client.PostAsync($"https://login.{environment}/oauth/token", content);
            var token = JObject.Parse(await response.Content.ReadAsStringAsync())["access_token"].ToString();
            return token;
        }

        private async Task<JObject> GetUserInfo(string accessToken) {
            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.GetAsync($"https://api.{environment}/api/v2/users/me");
            return JObject.Parse(await response.Content.ReadAsStringAsync());
        }

        public IActionResult Privacy() {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private string GetAuthTokenFromSession() {
            //TODO: ASP.NET 5 MVC 6 preview does not have native sessions. Implement your own session handling here
            return "";
        }

        private void SetAuthTokenToSession(string authToken) {
            //TODO: ASP.NET 5 MVC 6 preview does not have native sessions. Implement your own session handling here
        }
    }
}
