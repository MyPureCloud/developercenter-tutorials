using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNet.Mvc;
using Microsoft.Framework.WebEncoders;
using Newtonsoft.Json.Linq;

namespace authorization_code_aspdotnet.Controllers
{
    public class HomeController : Controller
    {
        private string host = "mypurecloud.com";

        public async Task<IActionResult> Index()
        {
            ViewData["Title"] = "Home page";

            var authToken = GetAuthTokenFromSession();

            if (Request.Query.ContainsKey("code"))
            {
                try
                {
                    var code = Request.Query["code"];
                    authToken = await GetTokenFromCode(code);
                    ViewData["AccessToken"] = authToken;

                    var user = GetUserInfo(authToken);
                    ViewData["Username"] = user.Result["name"].ToString();
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    Console.WriteLine(ex.StackTrace);
                }
            }

            if (string.IsNullOrEmpty(authToken))
            {
                return Redirect("https://login." + host + "/oauth/authorize?client_id=6220730c-d0e4-4fde-af3d-5ffgdca94e22" +
                                "&response_type=code&redirect_uri=" +
                                UrlEncoder.Default.UrlEncode("http://localhost:51643/home/"));
            }

            return View();
        }

        public IActionResult Error()
        {
            return View("~/Views/Shared/Error.cshtml");
        }

        private async Task<string> GetTokenFromCode(string code)
        {
            var client = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", "http://localhost:51643/home/")
            });
            var basicAuth = Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes("6220730c-d0e4-4fde-af3d-5ffgdca94e22:BC2GlOXcBXof56PSR8CA0TB6tHdlj3DLPEQ8hwf87kI"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            var response = await client.PostAsync("https://login." + host + "/oauth/token", content);
            var token = JObject.Parse(await response.Content.ReadAsStringAsync())["access_token"].ToString();
            return token;
        }

        private async Task<JObject> GetUserInfo(string accessToken)
        {
            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.GetAsync("https://api." + host + "/api/v2/users/me");
            return JObject.Parse(await response.Content.ReadAsStringAsync());
        }

        private string GetAuthTokenFromSession()
        {
            //TODO: ASP.NET 5 MVC 6 preview does not have native sessions. Implement your own session handling here
            return "";
        }

        private void SetAuthTokenToSession(string authToken)
        {
            //TODO: ASP.NET 5 MVC 6 preview does not have native sessions. Implement your own session handling here
        }
    }
}
