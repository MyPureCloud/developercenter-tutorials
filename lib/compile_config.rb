require 'yaml'
require "base64"
require 'mustache'

def compile_config(directory)
    files = {}

    config = YAML.load_file("#{directory}/config.yaml")

    config.each do |language, settings|
        settings["steps"].each do |step|
            filename = step["file"]
            if !files.has_key? settings[filename]
                files[filename] = {
                    :filename => filename,
                    :comma => true,
                    :data => Base64.strict_encode64(File.open("#{directory}/#{filename}", "r").read)
                }
            end
            step[:comma] = true
        end

        settings["steps"][settings["steps"].count-1][:comma] = false

        settings[:language] = language
        settings[:comma] = true

    end

    tutorial_config = {
        :files => files.values,
        :config => config.values
    }

    tutorial_config[:files][tutorial_config[:files].count-1][:comma] = false
    tutorial_config[:config][tutorial_config[:config].count-1][:comma] = false

    #puts config
    template = File.read('config.mustache')
    Mustache.render(template, tutorial_config)
end
