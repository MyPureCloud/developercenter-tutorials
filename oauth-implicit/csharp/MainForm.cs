using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace implicit_winform
{
    public partial class MainForm : Form
    {
        public MainForm()
        {
            InitializeComponent();
            webBrowser1.BringToFront();
            webBrowser1.Visible = true;

            // Implicit Grant Credentials
            string clientId = Environment.GetEnvironmentVariable("GENESYS_CLOUD_CLIENT_ID");
            
            // expected format: mypurecloud.com
            string environment = Environment.GetEnvironmentVariable("GENESYS_CLOUD_ENVIRONMENT");

            //Redirect the browser to the login window.
            webBrowser1.Url = new Uri( $"https://login.{environment}/oauth/authorize?" +
                                            "response_type=token" +
                                            $"&client_id={clientId}" +
                                            "&redirect_uri=http://localhost:8085/oauth2/callback");

        }

        private void LoadUserInformation(string bearerToken)
        {
            webBrowser1.Visible = false;

            //Make a request to /api/v2/users/me
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create($"https://api.{environment}/api/v2/users/me");
            request.Method = "GET";
            request.Headers.Add("Authorization", "Bearer " + bearerToken);

            WebResponse webResponse = request.GetResponse();
            using (Stream webStream = webResponse.GetResponseStream())
            {
                if (webStream != null)
                {
                    using (StreamReader responseReader = new StreamReader(webStream))
                    {
                        string response = responseReader.ReadToEnd();
                        Console.Out.WriteLine(response);
                        txtInfo.Text = response;
                    }
                }
            }
        }

        private void OnWebBrowserNavigating(object sender, WebBrowserNavigatingEventArgs e)
        {
            //When the web browser control navigates, check if the url is the callback and contains the access_token
            var url = e.Url.ToString();
            if (url.Contains("access_token"))
            {
                var queryString = url.Substring(url.LastIndexOf("#")+1);
                var props = queryString.Split('&');
                var authCode = props[0].Split('=')[1];
                LoadUserInformation(authCode);
            }
        }
    }
}
