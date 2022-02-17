$secret = $Env:genesys_cloud_secret;
$id = $Env:genesys_cloud_client_id;
$environment = $Env:genesys_cloud_environment; # eg. mypurecloud.com

$auth  = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("${id}:${secret}"))


$response = Invoke-WebRequest -Uri "https://login.${environment}/oauth/token" -Method POST -Body @{grant_type='client_credentials'} -Headers @{"Authorization"="Basic ${auth}"}

$responseData = $response.content  | ConvertFrom-Json

$roleResponse = Invoke-WebRequest -Uri "https://api.${environment}.com/api/v2/authorization/roles" -Method GET -Headers @{"Authorization"= $responseData.token_type + " " + $responseData.access_token}
write-host $roleResponse.content
