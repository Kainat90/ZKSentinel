import styles from './Toggle.module.css';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}

export function Toggle({ checked, onChange, id }: Props) {
  const uid = id || Math.random().toString(36).slice(2);
  return (
    <label htmlFor={uid} className={styles.track} data-on={checked}>
      <input
        type="checkbox"
        id={uid}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span className={styles.knob} />
    </label>
  );
}
