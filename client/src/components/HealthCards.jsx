
import {
    Database,
    Boxes,
    FileText,
    CheckCircle2,
} from "lucide-react";

export default function HealthCards({
    health,
    documentCount = 0,
}) {
    const cards = [
        {
            title: "PostgreSQL + pgvector",
            description: "Relational metadata and vector storage",
            icon: Database,
            status: health?.postgres ? "Connected" : "Waiting",
            active: Boolean(health?.postgres),
        },
        {
            title: "Redis + BullMQ",
            description: "Asynchronous document processing",
            icon: Boxes,
            status: health?.redis ? "Connected" : "Waiting",
            active: Boolean(health?.redis),
        },
        {
            title: "Documents",
            description: "Uploaded document inventory",
            icon: FileText,
            status: `${documentCount} documents`,
            active: true,
        },
        {
            title: "Backend API",
            description: "Express running on port 5000",
            icon: CheckCircle2,
            status: health?.status === "ready" ? "Ready" : "Waiting",
            active: health?.status === "ready",
        },
    ];

    return (
        <section className="grid">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article key={card.title}>
                        <Icon />

                        <h3>{card.title}</h3>
                        <p>{card.description}</p>

                        <strong>
                            {card.active ? "● " : "○ "}
                            {card.status}
                        </strong>
                    </article>
                );
            })}
        </section>
    );
}
