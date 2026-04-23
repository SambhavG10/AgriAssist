-- Dynamically seed community posts using the first available user ID
DO $$
DECLARE
   first_user_id UUID;
BEGIN
   -- Grab the first user who signed up (usually the developer)
   SELECT id INTO first_user_id FROM auth.users LIMIT 1;
   
   IF first_user_id IS NOT NULL THEN
      -- Only insert if the table is currently empty
      IF NOT EXISTS (SELECT 1 FROM public.community_posts LIMIT 1) THEN
         INSERT INTO public.community_posts (user_id, title, content, crop_type, likes_count, replies_count)
         VALUES 
         (first_user_id, 'Tips for growing tomatoes in Summer?', 'I am planning to grow tomatoes this summer. Any special care regarding irrigation?', 'Tomato', 12, 4),
         (first_user_id, 'Organic fertilizers for Wheat', 'Can someone suggest good organic fertilizers for wheat? I want to switch from chemical ones.', 'Wheat', 45, 10),
         (first_user_id, 'Pest attack on my cotton crop', 'Found some whiteflies on my cotton leaves. What immediate actions should I take?', 'Cotton', 8, 2),
         (first_user_id, 'Market price predictions for Onion', 'Does anyone know if Onion prices will go up in the next month?', 'Onion', 22, 14);

         -- Update the user's profile to have some primary crops so Dashboard analytics isn't empty!
         UPDATE public.profiles 
         SET primary_crops = ARRAY['Wheat', 'Tomato', 'Cotton']
         WHERE user_id = first_user_id;
      END IF;
   END IF;
END $$;
