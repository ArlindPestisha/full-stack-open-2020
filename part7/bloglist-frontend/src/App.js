import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { connect } from "react-redux";
import { getTestIDs } from "./helpers/testHelper";
import { getTrimmedStr } from "./utils";
import { useField } from "./hooks";
import UserContext from "./UserContext";
import { displayNotification } from "./reducers/notificationReducer";
import loginService from "./services/login";
import blogsService from "./services/blogs";
import Toggleable from "./components/Toggleable";
import ToTopScroller from "./components/ToTopScroller";
import NavBar from "./components/NavBar";
import NotificationList from "./components/NotificationList";
import Login from "./components/Login";
import ModalSpinner from "./components/ModalSpinner";
import BlogForm from "./components/BlogForm";
import BlogList from "./components/BlogList";

export const testIDs = getTestIDs();

function App({ displayNotification }) {
  const [blogs, setBlogs] = useState([]);
  const [user, setUser] = useState(null);
  const [username, resetUsername] = useField({ placeholder: "Enter Username" });
  const [password, resetPassword] = useField({ placeholder: "Enter Password" });
  const blogFieldClass = "c-row__input c-row__input--inBlog";
  const [title, resetTitle] = useField({ className: blogFieldClass });
  const [author, resetAuhor] = useField({ className: blogFieldClass });
  const [url, resetUrl] = useField({ className: blogFieldClass, type: "url" });
  const [fetchError, setFetchError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const blogFormRef = useRef();
  const toTopScrollerRef = useRef();

  // Get persisted logged in user from localStorage
  useEffect(() => {
    const loggedInBloglistUser = localStorage.getItem("loggedInBloglistUser");
    if (loggedInBloglistUser) {
      const storedUser = JSON.parse(loggedInBloglistUser);
      setUser(storedUser);
      blogsService.setToken(storedUser.token);
    }
  }, []);

  // Fetch blogs from backend on initial app load
  useEffect(() => {
    const setInitialBlogs = async () => {
      setFetchError(null);
      setIsLoading(true);

      try {
        const initialBlogs = await blogsService.getAll();
        setBlogs(initialBlogs);
      } catch (error) {
        if (error.response.status >= 400 && error.response.status < 500) {
          setFetchError(error.response.data);
        } else {
          setFetchError({ message: "Oops! Something went wrong" });
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      setInitialBlogs();
    }
  }, [user]);

  if (fetchError) {
    displayNotification(fetchError.message, "error");
    setFetchError(null);
  }

  // Handle DOM updates depending on if the login or blogs page is shown
  useLayoutEffect(() => {
    const rootStyle = document.documentElement.style;

    const handleScroll = () => {
      const { scrollTop } = document.documentElement;
      const pageHeight = document.documentElement.offsetHeight;
      const percentScrollTop = Math.round((scrollTop / pageHeight) * 100);

      if (!user || !toTopScrollerRef.current) return;

      if (percentScrollTop > 10) {
        toTopScrollerRef.current.show();
      } else {
        toTopScrollerRef.current.hide();
      }
    };

    const handleBlogToggleConflicts = (event) => {
      if (!event.target.classList.contains("js-blog")) return;

      if (event.keyCode === 32) {
        event.preventDefault();
      }
    };

    if (user) {
      rootStyle.setProperty("--body-bg-color", "var(--light-color)");
      window.addEventListener("scroll", handleScroll);
      window.addEventListener("keydown", handleBlogToggleConflicts);
    } else {
      rootStyle.setProperty("--body-bg-color", "var(--primary-color-faded)");
    }

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keydown", handleBlogToggleConflicts);
  }, [user]);

  const handleApiErrors = useCallback(
    (error, id) => {
      const statusCode = error.response.status;

      if (!statusCode) {
        return displayNotification("Oops! something went wrong", "error");
      }

      if (statusCode === 404) {
        setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog.id !== id));
        return displayNotification("Blog does not exist", "error");
      }

      if (statusCode >= 400 && statusCode < 500) {
        const errorMessages = error.response.data.messages;
        return errorMessages.forEach((m) => {
          displayNotification(m, "error");
        });
      }

      return displayNotification("Oops! something went wrong", "error");
    },
    [displayNotification]
  );

  const login = useCallback(
    async (event) => {
      event.preventDefault();
      setIsLoggingIn(true);

      try {
        const authUser = await loginService.login({
          username: username.value,
          password: password.value,
        });

        blogsService.setToken(authUser.token);
        setUser(authUser);
        localStorage.setItem("loggedInBloglistUser", JSON.stringify(authUser));
        displayNotification(`Logged in as ${authUser.username}`, "info");
      } catch (error) {
        handleApiErrors(error);
      } finally {
        resetUsername();
        resetPassword();
        setIsLoggingIn(false);
      }
    },
    [
      username.value,
      password.value,
      displayNotification,
      handleApiErrors,
      resetUsername,
      resetPassword,
    ]
  );

  const resetBlogForm = useCallback(() => {
    resetTitle();
    resetAuhor();
    resetUrl();
  }, [resetAuhor, resetTitle, resetUrl]);

  const logout = useCallback(() => {
    blogsService.setToken(null);
    localStorage.removeItem("loggedInBloglistUser");
    setUser(null);
    resetBlogForm();
    displayNotification("Logged out", "info");
  }, [displayNotification, resetBlogForm]);

  const addBlog = useCallback(
    async (event) => {
      event.preventDefault();
      const newBlog = {
        title: title.value,
        author: author.value,
        url: url.value,
      };
      setIsLoading(true);

      try {
        const returnedBlog = await blogsService.create(newBlog);
        blogFormRef.current.toggleVisibility();
        setBlogs((prevBlogs) => prevBlogs.concat(returnedBlog));
        resetBlogForm();
        const titleToShow = getTrimmedStr(returnedBlog.title);
        const message = `Added ${titleToShow} by ${returnedBlog.author ||
          "unknown author"}`;
        displayNotification(message, "success", 5000);
      } catch (error) {
        handleApiErrors(error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      title.value,
      author.value,
      url.value,
      resetBlogForm,
      displayNotification,
      handleApiErrors,
    ]
  );

  const likeBlog = useCallback(
    async (event, id) => {
      const blogToLike = blogs.find((blog) => blog.id === id);

      if (!blogToLike) {
        displayNotification("Blog does not exist", "error");
      } else {
        const updatedBlog = {
          ...blogToLike,
          likes: blogToLike.likes + 1,
          user: blogToLike.user.id,
        };

        setIsLoading(true);

        try {
          const returnedBlog = await blogsService.update(id, updatedBlog);
          setBlogs(blogs.map((blog) => (blog.id !== id ? blog : returnedBlog)));
        } catch (error) {
          handleApiErrors(error, id);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [blogs, displayNotification, handleApiErrors]
  );

  const deleteBlog = useCallback(
    async (event, id, title) => {
      const titleToShow = getTrimmedStr(title);
      const willDelete = window.confirm(`Delete ${titleToShow}?`);

      if (!willDelete) return;
      setIsLoading(true);

      try {
        await blogsService.remove(id);
        setBlogs(blogs.filter((blog) => blog.id !== id));
        displayNotification(`Deleted Blog: ${titleToShow}`, "info");
      } catch (error) {
        handleApiErrors(error, id);
      } finally {
        setIsLoading(false);
      }
    },
    [blogs, displayNotification, handleApiErrors]
  );

  const ShowBlogFormBtn = () => (
    <>
      <button
        type="button"
        className="c-btn c-btn--success"
        onClick={() => blogFormRef.current.toggleVisibility()}
      >
        + Blog
      </button>
    </>
  );

  const HideBlogFormBtn = () => (
    <>
      <button
        type="button"
        className="c-btn"
        onClick={() => blogFormRef.current.toggleVisibility()}
      >
        Cancel
      </button>
    </>
  );

  const blogForm = () => (
    <Toggleable
      ref={blogFormRef}
      cb={resetBlogForm}
      contextClass="inBlogForm"
      buttons={{ show: <ShowBlogFormBtn />, hide: <HideBlogFormBtn /> }}
      testid={testIDs.toggleableBlogForm}
    >
      <BlogForm
        title={title}
        author={author}
        url={url}
        handleSubmit={addBlog}
      />
    </Toggleable>
  );

  const blogsSortedByLikesDesc = [...blogs].sort((currBlog, nextBlog) => {
    return nextBlog.likes - currBlog.likes;
  });

  return (
    <div className="o-wrapper js-wrapper">
      {!user && (
        <div className="o-container js-container">
          <NotificationList contextClass="inLogin" />

          <Login username={username} password={password} handleSubmit={login} />

          {isLoggingIn && <ModalSpinner />}
        </div>
      )}

      {user && (
        <div className="o-container js-container">
          <UserContext.Provider value={user}>
            <NavBar
              handleLogout={logout}
              brandTitle="Blog List"
              isLoading={isLoading}
            />
            <div className="c-blogs" data-testid={testIDs.blogs}>
              <NotificationList contextClass="inBlog" />
              {blogForm()}
              <BlogList
                blogs={blogsSortedByLikesDesc}
                isLoading={isLoading}
                handleLike={likeBlog}
                handleDelete={deleteBlog}
              />
            </div>
          </UserContext.Provider>

          <ToTopScroller ref={toTopScrollerRef} />
        </div>
      )}
    </div>
  );
}

export default connect(null, { displayNotification })(App);
