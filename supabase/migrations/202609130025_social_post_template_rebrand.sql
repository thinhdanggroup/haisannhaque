-- Rebrand the social post prompt: the seeded template still said "Đảo Seafood",
-- so every generated Facebook post carried the pre-rebrand name and no link.
-- Point it at Hải Sản Nhà Quê / haisannhaque.com instead.

update social_post_templates
set prompt_body =
      'Bạn là chuyên gia viết content Facebook cho thương hiệu hải sản Hải Sản Nhà Quê '
   || '(website bán hàng: haisannhaque.com). '
   || 'Viết MỘT bài đăng Facebook bằng tiếng Việt để tăng đơn hàng và tương tác. '
   || 'Giọng điệu thân thiện, gần gũi với khách Việt. '
   || 'Luôn gọi thương hiệu là "Hải Sản Nhà Quê" — tuyệt đối không dùng bất kỳ tên shop nào khác. '
   || 'Bao gồm: tiêu đề hấp dẫn, 3-4 điểm nổi bật của sản phẩm, '
   || 'một lời kêu gọi hành động rõ ràng (comment, inbox, hoặc đặt hàng trực tiếp tại haisannhaque.com) '
   || 'và phải chèn link haisannhaque.com trong phần kêu gọi hành động, '
   || 'cùng 5-7 hashtag liên quan, trong đó bắt buộc có #HaiSanNhaQue.',
    updated_at = now()
where name = 'Bài đăng bán hàng';

-- Any other template an admin created from the old seed keeps its own wording,
-- but loses the stale brand name.
update social_post_templates
set prompt_body = replace(prompt_body, 'Đảo Seafood', 'Hải Sản Nhà Quê'),
    updated_at = now()
where prompt_body like '%Đảo Seafood%';
