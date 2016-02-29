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

        public async Task<ViewResult> Index()
        {
            ViewData["Title"] = "Home page";

            if (Request.Query.ContainsKey("code"))
            {
                try
                {
                    var code = Request.Query["code"];
                    var token = await GetTokenFromCode(code);
                    ViewData["AccessToken"] = token;

                    var user = GetUserInfo(token);
                    ViewData["Username"] = user.Result["name"].ToString();
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                    Console.WriteLine(ex.StackTrace);
                }
            }

            return View();
        }

        public IActionResult Login()
        {
            var clientId = "a0bda580-cb41-4ff6-8f06-28ffb4227594";

            return Redirect("https://login.ininsca.com/authorize?client_id=" + clientId +
                            "&response_type=code&redirect_uri=" +
                            UrlEncoder.Default.UrlEncode("http://localhost:51643/home/AuthCodeRedirect"));
        }

        public IActionResult AuthCodeRedirect()
        {
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
                new KeyValuePair<string, string>("redirect_uri", "http://localhost:51643/home/AuthCodeRedirect")
            });
            var basicAuth = Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes("a0bda580-cb41-4ff6-8f06-28ffb4227594:e-meQ53cXGq53j6uffdULVjRl8It8M3FVsupKei0nSg"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            var response = await client.PostAsync("https://login.ininsca.com/token", content);
            var token = JObject.Parse(await response.Content.ReadAsStringAsync())["access_token"].ToString();
            return token;
        }

        private async Task<JObject> GetUserInfo(string accessToken)
        {
            var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.GetAsync("https://api.ininsca.com/api/v1/users/me");
            return JObject.Parse(await response.Content.ReadAsStringAsync());
        }
    }
}
