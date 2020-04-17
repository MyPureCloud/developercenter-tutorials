//
//  ViewController.swift
//  iOS Auth Tutorial
//
//  Created by Tim Smith on 9/10/19.
//  Copyright © 2019 Genesys. All rights reserved.
//

import UIKit
import PureCloudPlatformClientV2
import WebKit

// extension to parse received URL
extension URL {
    subscript(queryParam: String) -> String? {
        guard let url = URLComponents(string: self.absoluteString) else { return nil }
        if let parameters = url.queryItems {
            return parameters.first(where: { $0.name == queryParam })?.value
        } else if let paramPairs = url.fragment?.components(separatedBy: "?").last?.components(separatedBy: "&") {
            for pair in paramPairs where pair.contains(queryParam) {
                return pair.components(separatedBy: "=").last
            }
            return nil
        } else {
            return nil
        }
    }
}

class ViewController: UIViewController, WKNavigationDelegate {
    @IBOutlet weak var lblName: UILabel!
    @IBOutlet weak var profileImage: UIImageView!
    @IBOutlet weak var webView: WKWebView!
    @IBOutlet weak var btnLogOut: UIButton!
    
    let ENV = "mypurecloud.com"
    // This client ID can be used with redirect URI http://fakeredirecturi/oauth2/callback
    let CLIENT_ID = "2cde0497-c910-4048-8a04-0d2b302b946f"
    let REDIRECT_HOST = "fakeredirecturi"
    let REDIRECT_PATH = "/oauth2/callback"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        print("View loaded")
        webView.navigationDelegate = self
        PureCloudPlatformClientV2API.basePath = "https://api." + ENV
        authorizeApp()
    }
    
    func authorizeApp() {
        NSLog("Authorizing...")
        
        // Build authorization URL
        // https://developer.mypurecloud.com/api/rest/authorization/use-implicit-grant.html
        var myURL = URLComponents();
        myURL.scheme = "https"
        myURL.host = "login." + ENV
        myURL.path = "/oauth/authorize"
        myURL.queryItems = [
            URLQueryItem(name: "response_type", value: "token"),
            URLQueryItem(name: "client_id", value: CLIENT_ID),
            URLQueryItem(name: "redirect_uri", value: "http://" + REDIRECT_HOST + REDIRECT_PATH)
        ]
        
        // Begin auth flow (navigate browser)
        let myRequest = URLRequest(url: myURL.url!)
        webView.isHidden = false
        webView.load(myRequest)
    }
    
    @IBAction func btnLogOut(_ sender: Any) {
        self.logOut()
    }
    
    func logOut() {
        NSLog("Ending session...")
        
        // Navigate to logout URL (do not show window here)
        webView.load(URLRequest(url: URL(string: "https://login." + ENV + "/logout")!))
        
        // Reset UI components
        DispatchQueue.main.async {
            self.profileImage.image = nil
            self.lblName.text = ""
        }
    }
    
    public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Swift.Void)
    {
        NSLog("Navigating: " + (navigationAction.request.url?.absoluteString ?? ""))
        
        if navigationAction.request.url != nil
        {
            let url = navigationAction.request.url
            if url?.host == REDIRECT_HOST && url?.path == REDIRECT_PATH {
                // Get access token from redirect URL
                let access_token = navigationAction.request.url?["access_token"]
                if (access_token != nil) {
                    NSLog("Obtained access token, SDK is now authorized")
                    
                    // Hide web view
                    webView.isHidden = true
                    
                    // Set access token on SDK
                    PureCloudPlatformClientV2API.accessToken = access_token
                    
                    // Cancel navigation - this isn't a real URL
                    decisionHandler(.cancel)
                    
                    // Make an API request
                    self.getMe()
                    
                    return
                }
            } else if url?.host == "login." + ENV && navigationAction.request.url?["logout"] == "true" {
                // Logout completed, initiate login process
                decisionHandler(.cancel)
                self.authorizeApp()
                return
            }
        }
        
        // Default: allow navigation
        decisionHandler(.allow)
    }
    
    func getMe() {
        NSLog("Calling getUsersMe...")
        let expand: [String] = [UsersAPI.Expand_getUsersMe.presence.rawValue]
        UsersAPI.getUsersMe(expand: expand) { (response, error) in
            if let error = error {
                NSLog("Error calling getUsersMe:")
                dump(error)
            } else {
                NSLog("My user: " + (response?.name! ?? ""))
                dump(response)
                
                // Show user's name
                DispatchQueue.main.async {
                    self.lblName.text = response?.name ?? "No Name"
                }
                
                // Load profile image
                let imageUrl = response?.images?.last?.imageUri
                if (imageUrl != nil) {
                    // Make HTTP request to retrieve image
                    // Credit: https://www.simplifiedios.net/get-image-from-url-swift-3-tutorial/
                    let session = URLSession(configuration: .default)
                    let getImageFromUrl = session.dataTask(with: URL(string: imageUrl!)!) { (data, response, error) in
                        if let e = error {
                            NSLog("Error fetching profile image:")
                            dump(e)
                        } else {
                            if (response as? HTTPURLResponse) != nil {
                                if let imageData = data {
                                    // Get image from data
                                    let image = UIImage(data: imageData)
                                    
                                    // Show image
                                    DispatchQueue.main.async {
                                        self.profileImage.image = image
                                    }
                                } else {
                                    NSLog("Image file is currupted")
                                }
                            } else {
                                NSLog("No response from server")
                            }
                        }
                    }
                    
                    // Start image download
                    getImageFromUrl.resume()
                }
            }
        }
    }


}

