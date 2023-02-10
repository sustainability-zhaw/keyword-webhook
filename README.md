# keyword-webhook
A GitHub Webhook Handler to update the keywords used by the indexer.

This is a compagnion service for the [keywords-repo](https://github.com/sustainability-zhaw/keywords).

The service is installed as a webhook next to the dashboard.

- The service currently needs a Github.com Token for accessing the repository data.
- The serivce will listen to a particular branch and subfolder to determine the correct EXCEL files. 
- The service will import the 16 keyword lists on initial startup (or relaunch). **This will cause a temporary loss of index stats, whenever the webhook is restarted!** 

The serivce responds to `Ping` and `Push` requests and ignores anything else. 

## Configuration 

The service has few configuration options. The configuration options should be located in `/etc/app/config.json`. The file should be injected via a secret. 

```JSON
{
    "ghtoken" : "github_YOUR_ACCESS_TOKEN",
    "apiurl": "http://db:8080/graphql",
    "branch": "main",
    "target_path": "data/sdgs",
    "relax": "yes",
    "ghsecret": "used_by_github"
}
```

- `ghtoken` - provides the access token for loading the EXCEL Files from the Github API. This allows to move the Keywords into a private repo. This token is sensitive information and should be properly secured. 
- `apiurl` - provides the internal API endpoint to the database. This URL is relative to the cluster.
- `branch` - allows to change the branch from which the files are loaded. Normally this will remain `main`. 
- `target_path` - from which subdirectory to load the keyword files. THe webhook really only responds to the files in this directory. This should point to `data/sdgs`. Note, no trailing slash!
- `relax` - if set to `yes` or `YES` or `Yes`, the service will not import the 16 keyword lists on startup. This is useful when updating the webhook on a running system.
- `ghscret` - this is the secret is used by github to connect to the webhook. The service will reject any other requests.

