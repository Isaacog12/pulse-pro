import { useNavigate, useParams } from "react-router-dom";
// We import the component from where you said it is:
import { PostDetailModal } from "@/components/pulse/PostDetailModal"; 

export default function PostDetail() {
  const { postId } = useParams(); // Grab ID from URL
  const navigate = useNavigate();

  // If user closes the modal, go back to Feed
  const handleClose = () => {
    navigate('/');
  };

  if (!postId) return null;

  return (
    <div className="min-h-screen bg-black/90 backdrop-blur-sm">
       {/* Render the component you already have */}
       <PostDetailModal 
         postId={postId} 
         onClose={handleClose} 
         onViewProfile={(userId) => navigate(`/profile/${userId}`)}
       />
    </div>
  );
}
