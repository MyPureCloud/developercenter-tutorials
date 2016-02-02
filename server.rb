require 'haml'
require 'sinatra'

get '/tutorials.js' do
    content_type "application/javascript"
    File.read(File.dirname(__FILE__) + "/tutorials.js")
end

get '/tutorials.css' do
    content_type "text/css"
    File.read(File.dirname(__FILE__) + "/tutorials.css")
end


get '/*' do
    viewname = params[:splat].first

    if(viewname.include? ".")
        puts "Getting file: #{viewname}"
        viewname.gsub! /index/, ""
        File.read(File.dirname(__FILE__) + "/#{viewname}")
    else
        puts viewname
        haml :"../#{viewname}.html"
    end
end
