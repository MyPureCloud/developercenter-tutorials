require 'haml'
require 'sinatra'
require_relative 'lib/compile_config'

get '/tutorials.js' do
    content_type "application/javascript"
    File.read(File.dirname(__FILE__) + "/tutorials.js")
end

get '/tutorials.css' do
    content_type "text/css"
    File.read(File.dirname(__FILE__) + "/tutorials.css")
end

get '/*/config.js' do
    content_type "application/javascript"
    compile_config params[:splat].first.gsub /js/, "yaml"
end

get '/*' do
    viewname = params[:splat].first

    if(viewname.include? ".")
        puts "Getting file: #{viewname}"

        content_type "application/javascript" if viewname.include? ".js"


        viewname.gsub! /index/, ""
        File.read(File.dirname(__FILE__) + "/#{viewname}")
    else
        puts viewname
        haml :"../#{viewname}.html"
    end
end
