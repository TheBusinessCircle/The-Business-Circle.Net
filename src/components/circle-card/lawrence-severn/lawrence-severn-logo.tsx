import styles from "./lawrence-severn.module.css";

/** Name-based identity until the business supplies its original logo artwork. */
export function LawrenceSevernLogoFace() {
  return <span className={styles.logoFace}>
    <span className={styles.logoEstablished}>EST. 1979</span>
    <span className={styles.logoName}>LAWRENCE<br />SEVERN</span>
    <span className={styles.logoSon}>& SON</span>
    <span className={styles.logoQuality}>QUALITY BUTCHERS</span>
    <span className={styles.logoTown}>HUCKNALL</span>
  </span>;
}
