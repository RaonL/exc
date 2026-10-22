import type { LBConfig, Site } from '../types';
import { Field } from './form-fields';
type Props = {
  config: LBConfig;
  setting: <K extends keyof LBConfig>(key: K, value: LBConfig[K]) => void;
};

export function VipFields({ config, setting, sites }: Props & { sites: Site[] }) {
  return (
    <>
      <Field label="VIP Advertisement">
        <select
          value={config.vip}
          onChange={(e) => setting('vip', e.target.value as LBConfig['vip'])}
        >
          {['Internet', 'Internet (Specified VIP)', 'Custom', 'Do Not Advertise'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      {config.vip === 'Internet (Specified VIP)' && (
        <Field label="Public IPv4 *">
          <input
            required
            placeholder="192.0.2.100"
            value={config.vipAddress}
            onChange={(e) => setting('vipAddress', e.target.value)}
          />
        </Field>
      )}
      {config.vip === 'Custom' && (
        <Field label="Site Reference *">
          <select
            required
            value={config.siteId}
            onChange={(e) => setting('siteId', e.target.value)}
          >
            <option value="">Select a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.kind})
              </option>
            ))}
          </select>
        </Field>
      )}
      <p className="configuration-help">Stored locally for training. No VIP is advertised.</p>
    </>
  );
}
export function DeliveryFields({ config, setting }: Props) {
  return (
    <>
      <Field label="Route Timeout (seconds)">
        <input
          type="number"
          min={1}
          max={600}
          value={config.timeout}
          onChange={(e) => setting('timeout', Number(e.target.value))}
        />
      </Field>
      <Field label="Path Normalization">
        <select
          value={config.pathNormalization === false ? 'Disable' : 'Enable'}
          onChange={(e) => setting('pathNormalization', e.target.value === 'Enable')}
        >
          <option>Enable</option>
          <option>Disable</option>
        </select>
      </Field>
      <p className="configuration-help">
        Delivery controls are persisted configuration examples; TLS, caching and path normalization
        are not network processing engines.
      </p>
    </>
  );
}
