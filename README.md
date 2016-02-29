This repo is pulled into the [PureCloud Developer Center](http://developer.mypurecloud.com) and contains walkthroughs of applications and examples.  
This project is based off of [Viewsaurus](https://www.npmjs.com/package/viewsaurus) which is MIT licensed at version 0.3.1 but adds multi language support.

# Adding a tutorial
1. Create a new folder from the project root, this folder name will show up in the url and should have a - between words.
2. Add a new mapping in config.yaml to provide a tutorial title to the directory you just created with a tutorial name, description and tags.  This file auto generates a listing page in th dev center.
3. Create an index.html.haml file inside the folder you created in step 1. This will be the guide.
4. There should be subfolders for each language. The language needs to match the language in the [ace supported languages](https://cdnjs.com/libraries/ace/) because we set the ace styling based on that folder name
5. Write the tutorial in index.html.haml
6. Run a local server by running ```ruby server.rb```
	1. If necessary, ```gem install sinatra````
7. Open your browser and browser to http://localhost:4567/\<tutorialdir>/index

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

There needs to be as many steps in that array as there are steps in the tutorial.

The index.html.ham file starts with the definition of the tutorial ```.tutorial{:data =>{:title=>'OAuth With Implicit Grant'}}``` which also contains the title that is displayed in the tutorial.  After that line, you can put your individual steps inside ```.step{:data=>{:title=>'Introduction'}}``` divs.  Make sure to specify a title for the step.

If you need to add a special note for a specific language, you can do that by putting it in a div with a .note .note-\<language> class, i.e. ```<div class="note note-csharp">```.  This block will only show for csharp examples.  


Don't get hung up on the styles of the tutorial.  We are using a pretty vanilla style here, but it will look much nicer when it is in the developer center.
