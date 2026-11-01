# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ActivityPub::Dereferencer do
  describe '#object' do
    subject { described_class.new(uri, permitted_origin: permitted_origin, signature_actor: signature_actor).object }

    let(:object) { { '@context': 'https://www.w3.org/ns/activitystreams', id: 'https://example.com/foo', type: 'Note', content: 'Hoge' } }
    let(:permitted_origin) { 'https://example.com' }
    let(:signature_actor) { nil }
    let(:uri) { nil }

    before do
      stub_request(:get, 'https://example.com/foo').to_return(body: object.to_json, headers: { 'Content-Type' => 'application/activity+json' })
    end

    context 'with a URI' do
      let(:uri) { 'https://example.com/foo' }

      it 'returns object' do
        expect(subject.with_indifferent_access).to eq object.with_indifferent_access
      end

      context 'with signature account' do
        let(:signature_actor) { Fabricate(:account) }

        it 'makes signed request' do
          subject
          expect(a_request(:get, 'https://example.com/foo').with { |req| req.headers['Signature'].present? }).to have_been_made
        end
      end

      context 'with different origin' do
        let(:uri) { 'https://other-example.com/foo' }

        it 'does not make request' do
          subject
          expect(a_request(:get, 'https://other-example.com/foo')).to_not have_been_made
        end
      end

      context 'when the object URL redirects to another origin' do
        let(:attacker_object) do
          {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: 'https://example.com/foo',
            type: 'Note',
            content: 'Evil',
          }
        end

        [301, 302, 307, 308].each do |status|
          context "with HTTP #{status}" do
            before do
              stub_request(:get, 'https://example.com/foo').to_return(
                status: status,
                headers: { 'Location' => 'https://evil.test/foo', 'Content-Type' => 'application/activity+json' }
              )
              stub_request(:get, 'https://evil.test/foo').to_return(
                status: 200,
                body: attacker_object.to_json,
                headers: { 'Content-Type' => 'application/activity+json' }
              )
            end

            it 'does not follow the redirect or return the destination body' do
              expect { subject }.to_not raise_error
              expect(subject).to be_nil
              expect(a_request(:get, 'https://evil.test/foo')).to_not have_been_made
            end
          end
        end
      end

      context 'when the object URL redirects to another path on the same host' do
        before do
          stub_request(:get, 'https://example.com/foo').to_return(
            status: 302,
            headers: { 'Location' => 'https://example.com/bar', 'Content-Type' => 'application/activity+json' }
          )
          stub_request(:get, 'https://example.com/bar').to_return(
            status: 200,
            body: object.to_json,
            headers: { 'Content-Type' => 'application/activity+json' }
          )
        end

        it 'does not follow the redirect' do
          expect { subject }.to_not raise_error
          expect(subject).to be_nil
          expect(a_request(:get, 'https://example.com/bar')).to_not have_been_made
        end
      end
    end

    context 'with a bearcap' do
      let(:uri) { 'bear:?t=hoge&u=https://example.com/foo' }

      it 'makes request with Authorization header' do
        subject
        expect(a_request(:get, 'https://example.com/foo').with(headers: { 'Authorization' => 'Bearer hoge' })).to have_been_made
      end

      it 'returns object' do
        expect(subject.with_indifferent_access).to eq object.with_indifferent_access
      end

      context 'with signature account' do
        let(:signature_actor) { Fabricate(:account) }

        it 'makes signed request' do
          subject
          expect(a_request(:get, 'https://example.com/foo').with { |req| req.headers['Signature'].present? && req.headers['Authorization'] == 'Bearer hoge' }).to have_been_made
        end
      end

      context 'with different origin' do
        let(:uri) { 'bear:?t=hoge&u=https://other-example.com/foo' }

        it 'does not make request' do
          subject
          expect(a_request(:get, 'https://other-example.com/foo')).to_not have_been_made
        end
      end

      context 'when the target URL redirects' do
        before do
          stub_request(:get, 'https://example.com/foo').to_return(
            status: 302,
            headers: { 'Location' => 'https://evil.test/foo', 'Content-Type' => 'application/activity+json' }
          )
          stub_request(:get, 'https://evil.test/foo').to_return(
            status: 200,
            body: object.to_json,
            headers: { 'Content-Type' => 'application/activity+json' }
          )
        end

        it 'does not follow the redirect or return the destination body' do
          expect { subject }.to_not raise_error
          expect(subject).to be_nil
          expect(a_request(:get, 'https://evil.test/foo')).to_not have_been_made
        end
      end
    end
  end
end
