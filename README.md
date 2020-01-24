This repo is pulled into the [PureCloud Developer Center](http://developer.mypurecloud.com) and contains walkthroughs of applications and examples.  
This project is based off of [Viewsaurus](https://www.npmjs.com/package/viewsaurus) which is MIT licensed at version 0.3.1 but adds multi language support.

# Adding a tutorial
1. Create a new folder from the project root, this folder name will show up in the url and should have a hyphen between words.
2. Add a new mapping in _/config.yaml_ to provide a tutorial title to the directory you just created with a tutorial name, description, and categories.  This file auto generates a listing page in the dev center.
3. Create the file  _/\<tutorialdir>/index.html.haml_ for the tutorial directory created in step 1. Write the step-by-step walkthrough for the tutorial in this file.
4. To create the tutorial for each language, subfolders should be created at _/\<tutorialdir>/\<language>/_ that share an exact name with an [ace supported language](https://cdnjs.com/libraries/ace/). The ace-specific folder name is used to infer a particular ace language for styling, formatting, and identifying which languages exist for a tutorial. Put the source code for the tutorial in the _\<language>_ directory.
5. For each language, add the lines to highlight for each step to _/\<tutorialdir>/config.yaml_.

# Running locally

_TBD_

# Tutorial guidelines

The tutorial should have a config.yaml file which maps to the language and files to highlight for each step

```
---
ruby:
    displayName: Ruby
    steps:
        - file: "ruby/server.rb"
          highlight: "0-100"
        - file: "ruby/server.rb"
          highlight: "5-15"
        - file: "ruby/server.rb"
          highlight: "17-21"

```

There need to be as many steps in that array as there are steps in the tutorial.

The index.html.ham file starts with the definition of the tutorial `.tutorial{:data =>{:title=>'OAuth With Implicit Grant'}}` which also contains the title that is displayed in the tutorial.  After that line, you can put your individual steps inside `.step{:data=>{:title=>'Introduction'}}` divs.  Make sure to specify a title for the step.

If you need to add a special note for a specific language, you can do that by putting it in a div with a .note .note-\<language> class, i.e. ```<div class="note note-csharp">```.  This block will only show for csharp examples.  

Don't get hung up on the styles of the tutorial.  We are using a pretty vanilla style here, but it will look much nicer when it is in the developer center.

# Coding Standards

Please consider these guidelines when contributing tutorials:

## General Guidelines

* Single purpose - Tutorials should cover a very narrow idea or task. A tutorial shouldn't attempt to demonstrate more than one concept.
* Keep it simple - Don't write any more code than is necessary to accomplish the happy path and log errors. Don't assume the reader has more than a basic understanding of the language or the API. Keep helper libraries and advanced design patterns to a minimum.
* Synchronous is good - Tutorials should focus on consumption of the APIs and SDKs, not coding best practices. It is preferable to have synchronous code that locks the UI rather than async and multi-threaded code; multi-threaded tutorials can be hard to follow.
* Use SDKs - Unless the tutorial is explicitly demonstrating how to do a non-SDK task, like OAuth, use the language-specific SDK to interact with the Platform API. 
* Project structure - Keep the file structure as flat as is reasonable and keep the file count as small as possible. Prefer to combine code into a single file when it is reasonable rather than creating a verbose project structure to follow a design pattern. Fewer files means less jumping around for the reader.
* Tutorials aren't exciting - Have a neat idea to showcase an API feature? Write an example app! Tutorials should be simple, boring, and concise. 

## Code Style

* Comment liberally! - Use plenty of comments to describe what the code is doing. Comments typically shouldn't describe more than 3-5 lines at a time. If a process is longer than that, break it out into smaller steps that can be individually commented.
* Use industry standards for the language - Every language has different standards. SomeUseCamelCase, some_use_underscores, some use lowerCamelCase. Use what will be most familiar for users of that language. 
* Use verbose variable names - Because tutorial code is meant to be read by humans, longer variable names are preferred to help give the reader more context. For example, instead of _response_, use _getMeResponse_. Instead of _api_, use _contentManagementApi_.
* Keep line length short - The recommended max characters per line, including whitespace, is 80 characters. The tutorial code view will only show the first 96 characters before requiring horizontal scrolling (bad!). Use proper indentation and line breaks to format the code for better readability when possible.
* Encapsulate functionality - Use methods/functions with descriptive names to encapsulate a task. This will help the reader understand the steps of the tutorial in small chunks. Try to find a balance between having one long linear block of code and breaking every step out into methods. Encapsulating code in methods is particularly useful to handle tasks that are necessary, but not the focus of the tutorial. A good example of when to encapsulate for this reason would be parsing a URL to get querystring parameters or logging data to the console or UI.
