export default function BusinessImpact() {
  return (
    <section
      className="panel business-impact"
      id="impact"
      aria-labelledby="impact-title"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow small">BUSINESS IMPACT</div>
          <h2 id="impact-title">
            Useful systems. <em>Meaningful outcomes.</em>
          </h2>
          <p>
            Define success around your actual workflow, then evaluate the pilot
            against it.
          </p>
        </div>
      </div>
      <div className="impact-grid">
        {[
          [
            "Less repetitive work",
            "Connect repetitive steps so your team can focus on exceptions and decisions.",
            "Evaluate: manual steps removed and the quality of exception handling.",
          ],
          [
            "More consistent support",
            "Ground answers in approved knowledge and preserve context when a person takes over.",
            "Evaluate: answer accuracy, coverage and successful human handoffs.",
          ],
          [
            "Clearer sales conversations",
            "Collect relevant lead context and make the next action visible in your CRM.",
            "Evaluate: brief completeness and the usefulness of sales handoffs.",
          ],
        ].map(([title, body, measure]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
            <small>{measure}</small>
          </article>
        ))}
      </div>
      <p className="impact-note">
        Intended outcomes, not reported client results. Scope, data readiness
        and adoption determine the impact.
      </p>
    </section>
  );
}
