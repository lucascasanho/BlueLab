# frozen_string_literal: true

require 'json'
require 'net/http'
require 'uri'

$stdout.sync = true

DOMAINS = %w(
  bolha.one
  ursal.zone
  masto.donte.com.br
  burnthis.town
  capivarinha.club
  mastodon.com.br
  bolha.us
  mastodon.social
).freeze

USER_AGENT = 'EspeluncaRemoteEmojiSync/1.0 (+https://espelunca.social)'
DELAY = 0.15

def fetch_json(url, redirects_left = 5)
  raise 'Redirecionamentos demais' if redirects_left.negative?

  uri = URI(url)

  request = Net::HTTP::Get.new(uri)
  request['User-Agent'] = USER_AGENT
  request['Accept'] = 'application/json'

  response = Net::HTTP.start(
    uri.host,
    uri.port,
    use_ssl: uri.scheme == 'https',
    open_timeout: 15,
    read_timeout: 60
  ) do |http|
    http.request(request)
  end

  case response
  when Net::HTTPSuccess
    JSON.parse(response.body)

  when Net::HTTPRedirection
    location = response['location']
    raise 'Redirecionamento sem Location' if location.blank?

    fetch_json(
      URI.join(url, location).to_s,
      redirects_left - 1
    )

  else
    raise "HTTP #{response.code} #{response.message}"
  end
end

total_added   = 0
total_updated = 0
total_existing = 0
total_failed = 0

puts
puts '=============================================='
puts ' Sincronização de emojis remotos - Espelunca'
puts '=============================================='
puts

DOMAINS.each do |domain|
  puts
  puts '=================================================='
  puts ">>> #{domain}"
  puts '=================================================='

  begin
    emojis = fetch_json("https://#{domain}/api/v1/custom_emojis")

    raise 'A API não retornou uma lista de emojis' unless emojis.is_a?(Array)

    puts "A API informou #{emojis.length} emojis."
    puts
  rescue => e
    puts "ERRO ao consultar #{domain}: #{e.class}: #{e.message}"
    total_failed += 1
    next
  end

  emojis.each_with_index do |data, index|
    shortcode = data['shortcode'].to_s.strip
    remote_url = data['url'].to_s.strip

    prefix = "[#{index + 1}/#{emojis.length}]"

    if shortcode.empty?
      puts "#{prefix} ignorado: shortcode vazio"
      total_failed += 1
      next
    end

    if remote_url.empty?
      puts "#{prefix} :#{shortcode}: ignorado: URL vazia"
      total_failed += 1
      next
    end

    begin
      emoji = CustomEmoji.find_or_initialize_by(
        shortcode: shortcode,
        domain: domain
      )

      new_record = emoji.new_record?

      needs_download =
        new_record ||
        emoji.image_file_name.blank? ||
        emoji.image_remote_url != remote_url

      emoji.visible_in_picker =
        data.key?('visible_in_picker') ? data['visible_in_picker'] : true

      #
      # IMPORTANTE:
      # usamos "url", e NÃO "static_url".
      #
      # Assim, se o emoji original for GIF,
      # o GIF animado é preservado.
      #
      emoji.image_remote_url = remote_url if needs_download

      raise emoji.errors.full_messages.join(', ') if (emoji.changed? || new_record) && !emoji.save

      if new_record
        total_added += 1
        puts "#{prefix} NOVO       :#{shortcode}:"
      elsif needs_download
        total_updated += 1
        puts "#{prefix} ATUALIZADO :#{shortcode}:"
      else
        total_existing += 1
        puts "#{prefix} JÁ EXISTE  :#{shortcode}:"
      end
    rescue => e
      total_failed += 1
      puts "#{prefix} FALHOU      :#{shortcode}:"
      puts "           #{e.class}: #{e.message}"
    ensure
      sleep DELAY
    end
  end
end

puts
puts '=============================================='
puts ' FINALIZADO'
puts '=============================================='
puts "Novos:       #{total_added}"
puts "Atualizados: #{total_updated}"
puts "Já existiam: #{total_existing}"
puts "Falhas:      #{total_failed}"
puts
puts "Remotos no banco agora: #{CustomEmoji.remote.count}"
puts "Locais no banco agora:  #{CustomEmoji.local.count}"
puts "Categorias agora:       #{CustomEmojiCategory.count}"
puts '=============================================='
