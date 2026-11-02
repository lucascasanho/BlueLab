# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JsonLdHelper do
  describe '#equals_or_includes?' do
    it 'returns true when value equals' do
      expect(helper.equals_or_includes?('foo', 'foo')).to be true
    end

    it 'returns false when value does not equal' do
      expect(helper.equals_or_includes?('foo', 'bar')).to be false
    end

    it 'returns true when value is included' do
      expect(helper.equals_or_includes?(%w(foo baz), 'foo')).to be true
    end

    it 'returns false when value is not included' do
      expect(helper.equals_or_includes?(%w(foo baz), 'bar')).to be false
    end
  end

  describe '#uri_from_bearcap' do
    subject { helper.uri_from_bearcap(string) }

    context 'when a bear string has a u param' do
      let(:string) { 'bear:?t=TOKEN&u=https://example.com/foo' }

      it 'returns the value from the u query param' do
        expect(subject).to eq('https://example.com/foo')
      end
    end

    context 'when a bear string does not have a u param' do
      let(:string) { 'bear:?t=TOKEN&h=https://example.com/foo' }

      it 'returns nil' do
        expect(subject).to be_nil
      end
    end

    context 'when a non-bear string' do
      let(:string) { 'http://example.com' }

      it 'returns the string' do
        expect(subject).to eq('http://example.com')
      end
    end
  end

  describe '#first_of_value' do
    context 'when value.is_a?(Array)' do
      it 'returns value.first' do
        value = ['a']
        expect(helper.first_of_value(value)).to be 'a'
      end
    end

    context 'with !value.is_a?(Array)' do
      it 'returns value' do
        value = 'a'
        expect(helper.first_of_value(value)).to be 'a'
      end
    end
  end

  describe '#supported_context?' do
    context 'when json is present and in an activitypub tagmanager context' do
      it 'returns true' do
        json = { '@context' => ActivityPub::TagManager::CONTEXT }.as_json
        expect(helper.supported_context?(json)).to be true
      end
    end

    context 'when not in activitypub tagmanager context' do
      it 'returns false' do
        json = nil
        expect(helper.supported_context?(json)).to be false
      end
    end
  end

  describe '#same_http_resource?' do
    def same?(left, right)
      helper.same_http_resource?(left, right)
    end

    it 'treats an empty path as /' do
      expect(same?('https://host.test', 'https://host.test/')).to be true
    end

    it 'treats hostnames as case-insensitive' do
      expect(same?('https://Example.COM/foo', 'https://example.com/foo')).to be true
    end

    it 'treats the default HTTPS port as optional' do
      expect(same?('https://host.test:443/foo', 'https://host.test/foo')).to be true
    end

    it 'treats percent-encoded tilde as ~' do
      expect(same?('https://host.test/%7Ealice', 'https://host.test/~alice')).to be true
    end

    it 'treats an IDN hostname as its punycode form' do
      expect(same?('https://münchen.example/foo', 'https://xn--mnchen-3ya.example/foo')).to be true
    end

    it 'accepts an unchanged canonical actor URI' do
      expect(same?('https://example.com/users/alice', 'https://example.com/users/alice')).to be true
    end

    it 'preserves a key fragment' do
      expect(same?('https://host.test/actor#main-key', 'https://host.test/actor#main-key')).to be true
    end

    it 'does not treat a fragment as optional' do
      expect(same?('https://host.test/actor#main-key', 'https://host.test/actor')).to be false
    end

    it 'does not merge a non-empty path with a trailing slash' do
      expect(same?('https://example.com/users/alice', 'https://example.com/users/alice/')).to be false
    end

    it 'does not equate HTTP and HTTPS' do
      expect(same?('http://host.test/foo', 'https://host.test/foo')).to be false
    end

    it 'does not equate a non-default port with the default port' do
      expect(same?('https://host.test:8443/foo', 'https://host.test/foo')).to be false
    end

    it 'does not equate different hosts' do
      expect(same?('https://victim.test/users/alice', 'https://evil.test/users/alice')).to be false
    end

    it 'does not equate different query strings' do
      expect(same?('https://host.test/foo?q=a', 'https://host.test/foo?q=b')).to be false
      expect(same?('https://host.test/foo?q=a%20b', 'https://host.test/foo?q=a+b')).to be false
    end

    it 'rejects userinfo on either URI' do
      expect(same?('https://evil.com@victim.test/x', 'https://victim.test/x')).to be false
      expect(same?('https://victim.test@evil.test/x', 'https://evil.test/x')).to be false
      expect(same?('https://user@host.test/x', 'https://user@host.test/x')).to be false
    end

    it 'rejects an invalid URI' do
      expect(same?('http://[', 'https://host.test/foo')).to be false
    end

    it 'rejects a non-HTTP scheme' do
      expect(same?('ftp://host.test/foo', 'ftp://host.test/foo')).to be false
      expect(same?('ftp://host.test/foo', 'https://host.test/foo')).to be false
    end

    it 'rejects a URI without a hostname' do
      expect(same?('https:///foo', 'https://host.test/foo')).to be false
    end

    it 'does not equate different fragments' do
      expect(same?('https://host.test/actor#main-key', 'https://host.test/actor#other-key')).to be false
    end
  end

  describe '#fetch_resource' do
    context 'when allow_redirects is true' do
      it 'returns resource even if the retrieved ID and the given URI does not match' do
        stub_request(:get, 'https://bob.test/').to_return(body: '{"id": "https://alice.test/"}', headers: { 'Content-Type': 'application/activity+json' })
        stub_request(:get, 'https://alice.test/').to_return(body: '{"id": "https://alice.test/"}', headers: { 'Content-Type': 'application/activity+json' })

        expect(fetch_resource('https://bob.test/', allow_redirects: true)).to eq({ 'id' => 'https://alice.test/' })
      end

      it 'returns nil if the object identified by the given URI and the object identified by the retrieved ID does not match' do
        stub_request(:get, 'https://mallory.test/').to_return(body: '{"id": "https://marvin.test/"}', headers: { 'Content-Type': 'application/activity+json' })
        stub_request(:get, 'https://marvin.test/').to_return(body: '{"id": "https://alice.test/"}', headers: { 'Content-Type': 'application/activity+json' })

        expect(fetch_resource('https://mallory.test/', allow_redirects: true)).to be_nil
      end
    end

    context 'when allow_redirects is false' do
      it 'returns nil if the retrieved ID and the given URI does not match' do
        stub_request(:get, 'https://mallory.test/').to_return(body: '{"id": "https://alice.test/"}', headers: { 'Content-Type': 'application/activity+json' })
        expect(fetch_resource('https://mallory.test/', allow_redirects: false)).to be_nil
      end

      it 'returns the resource when response.uri is the normalized form of the requested URI' do
        stub_request(:get, %r{\Ahttps://host\.test/?\z}).to_return(body: '{"id": "https://host.test"}', headers: { 'Content-Type': 'application/activity+json' })

        expect(fetch_resource('https://host.test', allow_redirects: false)).to eq({ 'id' => 'https://host.test' })
      end

      it 'returns nil when json id differs from the requested URI even if they normalize equally' do
        stub_request(:get, %r{\Ahttps://host\.test/?\z}).to_return(body: '{"id": "https://host.test/"}', headers: { 'Content-Type': 'application/activity+json' })

        expect(fetch_resource('https://host.test', allow_redirects: false)).to be_nil
      end

      [301, 302, 307, 308].each do |status|
        it "returns nil without following a cross-origin #{status}" do
          stub_request(:get, 'https://victim.test/users/alice').to_return(
            status: status,
            headers: { 'Location' => 'https://evil.test/alice', 'Content-Type' => 'application/activity+json' }
          )
          stub_request(:get, 'https://evil.test/alice').to_return(
            status: 200,
            body: '{"id": "https://victim.test/users/alice"}',
            headers: { 'Content-Type': 'application/activity+json' }
          )

          expect(fetch_resource('https://victim.test/users/alice', allow_redirects: false)).to be_nil
          expect(a_request(:get, 'https://evil.test/alice')).to_not have_been_made
        end
      end

      it 'returns nil without following a same-host redirect to another path' do
        stub_request(:get, 'https://victim.test/users/alice').to_return(
          status: 302,
          headers: { 'Location' => 'https://victim.test/users/bob', 'Content-Type' => 'application/activity+json' }
        )
        stub_request(:get, 'https://victim.test/users/bob').to_return(
          status: 200,
          body: '{"id": "https://victim.test/users/alice"}',
          headers: { 'Content-Type': 'application/activity+json' }
        )

        expect(fetch_resource('https://victim.test/users/alice', allow_redirects: false)).to be_nil
        expect(a_request(:get, 'https://victim.test/users/bob')).to_not have_been_made
      end
    end
  end

  describe '#fetch_resource_without_id_validation' do
    it 'returns nil if the status code is not 200' do
      stub_request(:get, 'https://host.test/').to_return(status: 400, body: '{}', headers: { 'Content-Type': 'application/activity+json' })
      expect(fetch_resource_without_id_validation('https://host.test/')).to be_nil
    end

    it 'returns nil if the body is not parsable' do
      stub_request(:get, 'https://host.test/').to_return(status: 200, body: 'XXX', headers: { 'Content-Type': 'application/activity+json' })
      expect(fetch_resource_without_id_validation('https://host.test/')).to be_nil
    end

    it 'returns hash' do
      stub_request(:get, 'https://host.test/').to_return(status: 200, body: '{}', headers: { 'Content-Type': 'application/activity+json' })
      expect(fetch_resource_without_id_validation('https://host.test/')).to eq({})
    end

    it 'returns the body when redirects are disallowed and response.uri is normalized' do
      stub_request(:get, %r{\Ahttps://host\.test/?\z}).to_return(status: 200, body: '{}', headers: { 'Content-Type': 'application/activity+json' })

      expect(fetch_resource_without_id_validation('https://host.test', allow_redirects: false)).to eq({})
    end
  end

  context 'with compaction and forwarding' do
    let(:json) do
      {
        '@context' => [
          'https://www.w3.org/ns/activitystreams',
          'https://w3id.org/security/v1',
          {
            'obsolete' => 'http://ostatus.org#',
            'convo' => 'obsolete:conversation',
            'new' => 'https://obscure-unreleased-test.joinmastodon.org/#',
          },
        ],
        'type' => 'Create',
        'to' => ['https://www.w3.org/ns/activitystreams#Public'],
        'object' => {
          'id' => 'https://example.com/status',
          'type' => 'Note',
          'inReplyTo' => nil,
          'convo' => 'https://example.com/conversation',
          'tag' => [
            {
              'type' => 'Mention',
              'href' => ['foo'],
            },
          ],
        },
        'signature' => {
          'type' => 'RsaSignature2017',
          'created' => '2022-02-02T12:00:00Z',
          'creator' => 'https://example.com/actor#main-key',
          'signatureValue' => 'some-sig',
        },
      }
    end

    describe '#compact' do
      it 'properly compacts JSON-LD with alternative context definitions' do
        expect(compact(json).dig('object', 'conversation')).to eq 'https://example.com/conversation'
      end

      it 'compacts single-item arrays' do
        expect(compact(json).dig('object', 'tag', 'href')).to eq 'foo'
      end

      it 'compacts the activitystreams Public collection' do
        expect(compact(json)['to']).to eq 'as:Public'
      end

      it 'properly copies signature' do
        expect(compact(json)['signature']).to eq json['signature']
      end
    end

    describe 'patch_for_forwarding!' do
      it 'properly patches incompatibilities' do
        json['object'].delete('convo')
        compacted = compact(json)
        patch_for_forwarding!(json, compacted)
        expect(compacted['to']).to eq ['https://www.w3.org/ns/activitystreams#Public']
        expect(compacted.dig('object', 'tag', 0, 'href')).to eq ['foo']
        expect(safe_for_forwarding?(json, compacted)).to be true
      end

      context 'when array size mismatch exists' do
        subject { helper.patch_for_forwarding!(json, alternate) }

        let(:alternate) { json.merge('to' => %w(one two three)) }

        it { is_expected.to be_nil }
      end
    end

    describe 'safe_for_forwarding?' do
      it 'deems a safe compacting as such' do
        json['object'].delete('convo')
        compacted = compact(json)
        patch_for_forwarding!(json, compacted)
        expect(compacted['to']).to eq ['https://www.w3.org/ns/activitystreams#Public']
        expect(safe_for_forwarding?(json, compacted)).to be true
      end

      it 'deems an unsafe compacting as such' do
        compacted = compact(json)
        patch_for_forwarding!(json, compacted)
        expect(compacted['to']).to eq ['https://www.w3.org/ns/activitystreams#Public']
        expect(safe_for_forwarding?(json, compacted)).to be false
      end
    end
  end
end
