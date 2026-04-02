-- Populate the faqs table with some sample data
INSERT INTO public.faqs (question, answer) VALUES
('What is the best time to plant tomatoes in a temperate climate?', 'The best time to plant tomatoes is after the last spring frost. You can start seeds indoors 6-8 weeks before the last frost date.'),
('How can I get rid of aphids on my plants organically?', 'You can introduce beneficial insects like ladybugs, which are natural predators of aphids. Alternatively, you can spray the plants with a solution of water and a few drops of dish soap.'),
('What is crop rotation and why is it important?', 'Crop rotation is the practice of planting different crops sequentially on the same plot of land to improve soil health, optimize nutrients in the soil, and combat pest and weed pressure.');

-- Populate the knowledge_base_articles table with some sample data
INSERT INTO public.knowledge_base_articles (title, content) VALUES
('Understanding Soil Health', 'Soil health is the foundation of a productive farming system. It refers to the continued capacity of soil to function as a vital living ecosystem that sustains plants, animals, and humans. Key components include soil structure, organic matter, and a diverse community of soil organisms.'),
('Introduction to Integrated Pest Management (IPM)', 'Integrated Pest Management (IPM) is an ecosystem-based strategy that focuses on long-term prevention of pests or their damage through a combination of techniques such as biological control, habitat manipulation, modification of cultural practices, and use of resistant varieties. Pesticides are used only after monitoring indicates they are needed according to established guidelines, and treatments are made with the goal of removing only the target organism.');
