import Page from "../../../components/Page";

export default function Profile() {
  const styles: Record<string, React.CSSProperties> = {
    section: { marginTop: 28 },
  };

  return (
    <Page>
      <header>
        {/* TODO: Replace with your full name */}
        <h1>Koodinviilaus</h1>

        <h2>Full-Stack Developer</h2>

        {/* TODO: Replace with your one-line tagline / elevator pitch */}
        <p>WIP</p>
      </header>

      <section style={styles.section}>
        <h3>What I do</h3>
        {/* TODO: Write a short summary of your focus/strengths */}
        <p>WIP</p>
      </section>

      <section style={styles.section}>
        <h3>Experience</h3>
        {/* TODO: List key roles/projects/achievements */}
        <p>WIP</p>
      </section>

      <section style={styles.section}>
        <h3>Skills</h3>
        {/* TODO: List technologies/practices/expertise */}
        <p>WIP</p>
      </section>

      <footer style={styles.section}>
        {/* TODO: Add footer text or contact info later */}
        <p>Contact: WIP</p>
      </footer>
    </Page>
  );
}
