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
        private string host = "ininsca";

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
                return Redirect("https://login." + host + ".com/authorize?client_id=a0bda580-cb41-4ff6-8f06-28ffb4227594" +
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
            var basicAuth = Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes("a0bda580-cb41-4ff6-8f06-28ffb4227594:e-meQ53cXGq53j6uffdULVjRl8It8M3FVsupKei0nSg"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            var response = await client.PostAsync("https://login." + host + ".com/token", content);
            var token = JObject.Parse(await response.Content.ReadAsStringAsync())["access_token"].ToString();
            return token;
        }

        private async Task<JObject> GetUserInfo(string accessToken)
        {
            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.GetAsync("https://api." + host + ".com/api/v1/users/me");
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
