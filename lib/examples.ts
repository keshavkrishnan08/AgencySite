/* Offline model-answer generator. Produces a solid, STAR-structured example
   tailored to the question category + role. Claude enriches this when a key
   is present; without one, these keep the "see a strong answer" feature alive. */

function roleNoun(role: string): string {
  return role.trim() || "this role";
}

export function exampleAnswer(question: string, role: string, category = "behavioral"): string {
  const r = roleNoun(role);
  const q = question.toLowerCase();

  if (q.includes("tell me about yourself") || category === "warmup") {
    return `I'm a ${r} with about eight years of experience, and what I'm known for is staying calm and organized when things get busy. In my last role I ran the day-to-day operations for a team of twelve and cut our turnaround time by roughly 20% by rebuilding how we tracked requests. I love the part of this work where structure actually makes people's day easier. I'm here because this role lets me do more of exactly that, on a bigger stage. What I'm looking for next is a team where I can own a process end to end and make it measurably better.`;
  }

  if (q.includes("weakness")) {
    return `Early on, I held onto too much myself instead of delegating, I thought it was faster to just do it. About a year ago I started using a shared task board and a weekly handoff with my team. Since then my team's output has gone up and I've freed myself to focus on the work only I can do. So it's a real thing I've worked on, and I have the results to show the fix is sticking.`;
  }

  if (q.includes("why did you leave") || q.includes("gap") || category === "gap") {
    return `My position was eliminated in a restructuring. It had nothing to do with my performance, and I'm proud of what I built there. I used the time deliberately: I completed a certification in ${r.toLowerCase().includes("manager") ? "operations management" : "my field"} and did some freelance work to stay sharp. Honestly, the break gave me clarity on the kind of team I want to join next, which is exactly why I'm excited about this one.`;
  }

  if (q.includes("five years") || q.includes("5 years")) {
    return `In five years I want to be the person this team relies on to own a function and make it run better than it ever has. Realistically the tools will change a lot, so I'm less attached to a title than to a direction, I want to keep taking on bigger problems and developing the people around me. From what I've read about where you're headed, this role is a strong first step toward exactly that.`;
  }

  if (category === "closer" || q.includes("questions for")) {
    return `Yes. Two things. First, what does success look like in this role in the first ninety days, so I know exactly what to aim for? And second, you mentioned the team is growing. How is that changing the way the group works day to day? I ask because the teams I do my best work on are the ones that are actively building something, and it sounds like that's where you are.`;
  }

  // Default behavioral STAR
  return `Sure. At my last job we hit a stretch where two key people left at once and the workload didn't slow down. I was responsible for keeping our service levels from slipping. I sat down, mapped what only I could do versus what could be shifted, cross-trained two people in a week, and set up a simple daily check-in so nothing fell through the cracks. As a result we kept our on-time rate above 95% through the whole transition, and one of the people I trained was promoted six months later. The big lesson for me was that a clear plan calms a team down faster than working longer hours ever could.`;
}
